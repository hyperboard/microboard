import { Connection } from "Connection";
import { Board } from "Board";
import {
    EventsOperation,
    Operation,
    UndoableOperation,
} from "./EventsOperations";
import { EventsCommand } from "./EventsCommand";
import { Command, createCommand } from "./Command";
import { EventsLog } from "./EventsLog";
import { SocketMessage } from "../../Connection/SocketMessage";
import {
    enabledEmitDebug,
    enabledInsertEventDebug,
} from "./EventsDebugSettings";
import { Subject } from "Subject";

export class BoardEvent {
    constructor(public order: number = 0, public body: BoardEventBody) { }
}

export interface BoardEventBody {
    eventId: string;
    userId: number;
    boardId: string;
    operation: Operation;
}

export class Events {
    private eventCounter = 0;
    private itemCounter = 0;
    private log = new EventsLog(this.board, this);
    readonly latestEventTouch: { [key: string]: number } = {};
    latestServerOrder = 0;
    subject = new Subject<BoardEvent>();

    constructor(private board: Board, private connection: Connection) {
        connection.subscribe(board.getBoardId(), this.handleNewMessage);
        setInterval(this.republishEvents, 5000);
    }

    disconnect(): void {
        this.connection.unsubscribe(
            this.board.getBoardId(),
            this.handleNewMessage,
        );
    }

    handleNewMessage = (message: SocketMessage): void => {
        // console.info("connection.subscribe()", message);

        const addEvent = (event: BoardEvent): void => {
            if (event.order <= this.latestServerOrder) {
                return;
            }
            const eventConnectionId = parseFloat(
                event.body.eventId.split(":")[0],
            );
            const isEventFromFromOtherConnection =
                this.connection.connectionId !== eventConnectionId;
            if (isEventFromFromOtherConnection) {
                this.insertEvent(event);
                this.subject.publish(event);
            } else {
                this.setLocalEventOrder(event);
            }
            this.latestServerOrder = event.order;
        };

        if (message.type === "BoardEvent") {
            addEvent(message.event);
        } else if (message.type === "BoardEventList") {
            const events = message.events;
            if (this.log.list.length === 0 && events.length > 0) {
                this.insertEvents(events);
                this.subject.publish(events);
                this.latestServerOrder = events[events.length - 1].order;
            } else {
                for (const event of events) {
                    addEvent(event);
                }
            }
        }
    };

    insertEvent(event: BoardEvent): void {
        const unordered = this.log.popUnorderedRecords();
        const eventBody = event.body;
        if (enabledInsertEventDebug) {
            console.info("-> Events.insertEvent()", event);
        }
        const command = createCommand(this, this.board, eventBody.operation);
        const record = { event, command };
        // console.log("Insert", command, event);
        command.apply();
        this.log.push(record);
        this.log.pushRecordsStackAndRecreateCommands(
            unordered,
            this.createCommand,
        );
    }

    insertEvents(events: BoardEvent[]): void {
        const unordered = this.log.popUnorderedRecords();
        const mergedEvents = this.log.mergeEvents(events);
        for (const event of mergedEvents) {
            const eventBody = event.body;
            if (enabledInsertEventDebug) {
                console.info("-> Events.insertEvent()", event);
            }
            const command = createCommand(
                this,
                this.board,
                eventBody.operation,
            );
            const record = { event, command };
            command.apply();
            this.log.list.push(record);
        }
        this.log.pushRecordsStackAndRecreateCommands(
            unordered,
            this.createCommand,
        );
    }

    createCommand = (op: Operation): Command => {
        return createCommand(this, this.board, op);
    };

    setLocalEventOrder(event: BoardEvent): void {
        const record = this.log.getRecordById(event.body.eventId);
        if (record) {
            record.event.order = event.order;
        }
    }

    emit(operation: Operation, command: Command): void {
        if (enabledEmitDebug) {
            console.info("-> Events.emit()", operation);
        }
        // TODO replace connectionId with userId
        const eventBody = {
            eventId: this.getNextLocalEventId(),
            userId: this.connection.connectionId,
            boardId: this.board.getBoardId(),
            operation: operation,
        } as BoardEventBody;
        const event = new BoardEvent(0, eventBody);
        const record = { event, command };
        // console.log("Emit", command, event);
        this.log.push(record, false);
        // TODO replace connectionId with userId
        this.setLatestUserEvent(operation, this.connection.connectionId);
        this.connection.publishBoardEvent(this.board.getBoardId(), event);
        this.subject.publish(event);
    }

    republishEvents = (): void => {
        const unordered = this.log.popUnorderedRecordsWithoutRevert();
        for (const record of unordered) {
            this.connection.publishBoardEvent(
                this.board.getBoardId(),
                record.event,
            );
        }
        this.log.pushRecordsStackWithoutApply(unordered);
    };

    apply(operation: EventsOperation): void | false {
        switch (operation.method) {
            case "undo":
                return this.applyUndo(operation.eventId);
            case "redo":
                return this.applyRedo(operation.eventId);
        }
    }

    setLatestLocalEventId(localEventId: number): void {
        this.eventCounter = localEventId;
    }

    getNextLocalEventId(): string {
        const id = ++this.eventCounter;
        return this.connection.connectionId + ":" + id;
    }

    getNewItemId(): string {
        const id = ++this.itemCounter;
        return this.connection.connectionId + ":" + id;
    }

    applyUndo(updateLocalId: string): void {
        const record = this.log.getRecordById(updateLocalId);
        if (!record) {
            return;
        }
        const { userId, operation } = record.event.body;
        record.command.revert();
        /*
        switch (operation.class) {
            case "Board":
            case "Shape":
            case "Transformation":
            case "RichText":
                record.command.revert();
                break;
        }
        */
    }

    // RichText passes false because the undo is handled by the RichTextEditor
    undo(apply = true): void {
        // TODO replace connectionId with userId
        const record = this.log.getUserUndoRecord(this.connection.connectionId);
        if (!record) {
            return;
        }
        if (
            !this.canUndoEvent(
                record.event.body.operation,
                record.event.body.userId,
            )
        ) {
            return;
        }
        const operation: EventsOperation = {
            class: "Events",
            method: "undo",
            eventId: record.event.body.eventId,
        };
        const command = new EventsCommand(this, operation);
        if (apply) {
            command.apply();
        }
        this.emit(operation, command);
    }

    applyRedo(updateLocalId: string): void {
        const record = this.log.getRecordById(updateLocalId);
        if (!record) {
            return;
        }
        if (record.event.body.operation.method === "undo") {
            const undoable = this.log.getRecordById(
                record.event.body.operation.eventId,
            );
            undoable?.command.apply();
        } else {
            record.command.revert();
        }
    }

    redo(apply = true): void {
        // TODO replace connectionId with userId
        const record = this.log.getUserRedoRecord(this.connection.connectionId);
        if (!record) {
            return;
        }
        const operation: EventsOperation = {
            class: "Events",
            method: "redo",
            eventId: record.event.body.eventId,
        };
        const command = new EventsCommand(this, operation);
        if (apply) {
            command.apply();
        }
        this.emit(operation, command);
    }

    canUndoEvent(op: Operation, byUserId?: number): boolean {
        if (op.method === "undo") {
            return false;
        }
        if (op.method === "redo") {
            return true;
        }
        if (op.method === "paste") {
            return true;
        }
        const key = `${op.method}_${op.item}`;
        const latestUserIdEventTouch = this.latestEventTouch[key];
        return byUserId === undefined || byUserId === latestUserIdEventTouch;
    }

    setLatestUserEvent(operation: Operation, userId: number): void {
        if (operation.class !== "Events") {
            this.latestEventTouch[`${operation.method}_${operation.item}`] =
                userId;
        }
    }

    canUndo(): boolean {
        // TODO replace connectionId with userId
        const record = this.log.getUserUndoRecord(this.connection.connectionId);
        if (!record) {
            return false;
        }
        return this.canUndoEvent(
            record.event.body.operation,
            record.event.body.userId,
        );
    }

    canRedo(): boolean {
        // TODO replace connectionId with userId
        const record = this.log.getUserRedoRecord(this.connection.connectionId);
        return record !== null;
    }
}
