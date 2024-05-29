import { Board } from "Board";
import { EventsOperation, Operation } from "./EventsOperations";
import { EventsCommand } from "./EventsCommand";
import { Command } from "./Command";
import { createEventsLog } from "./EventsLog";
import { Subject } from "Subject";
import { Connection, SocketMessage } from "App/Connection";
import { BoardSnapshot } from "Board/Board";

const EVENTS_REPUBLISH_INTERVAL = 5000;

export interface Events {
	subject: Subject<BoardEvent>;
	serialize(): BoardEvent[];
	deserialize(serializedData: BoardEvent[]): void;
	getSnapshot(): BoardSnapshot;
	disconnect(): void;
	emit(operation: Operation, command: Command): void;
	apply(operation: EventsOperation): void | false;
	undo(): void;
	redo(): void;
	canUndo(): boolean;
	canRedo(): boolean;
}

export interface BoardEvent {
	order: number;
	body: BoardEventBody;
}

export interface BoardEventBody {
	eventId: string;
	userId: number;
	boardId: string;
	operation: Operation;
}

export function createEvents(board: Board, connection: Connection): Events {
	const log = createEventsLog(board);
	const latestEvent: { [key: string]: number } = {};
	let latestServerOrder = 0;
	const subject = new Subject<BoardEvent>();

	connection.subscribe(board.getBoardId(), handleNewMessage);
	setInterval(republishEvents, EVENTS_REPUBLISH_INTERVAL);

	function serialize(): BoardEvent[] {
		return log.serialize();
	}

	function deserialize(serializedData: BoardEvent[]): void {
		log.deserialize(serializedData);
	}

	function getSnapshot(): BoardSnapshot {
		return log.getSnapshot();
	}

	function disconnect(): void {
		connection.unsubscribe(board.getBoardId(), handleNewMessage);
	}

	function handleNewMessage(message: SocketMessage): void {
		switch (message.type) {
			case "BoardEvent":
				addEvent(message.event);
				break;
			case "BoardEventList":
				const events = message.events;
				const isFirstBatchOfEvents =
					log.list.length === 0 && events.length > 0;
				if (isFirstBatchOfEvents) {
					log.insertEvents(events);
					subject.publish(events);
					latestServerOrder = events[events.length - 1].order;
				} else {
					for (const event of events) {
						addEvent(event);
					}
				}
				onBoardLoad();
				break;
			case "CreateSnapshotRequest":
				const snapshot = getSnapshot();
				connection.publishSnapshot(board.getBoardId(), snapshot);
				break;
			case "BoardSnapshot":
				board.deserialize(message.snapshot);
				onBoardLoad();
				break;
		}
	}

	function onBoardLoad(): void {
		const searchParams = new URLSearchParams(
			window.location.search.slice(1),
		);
		const toFocusId = searchParams.get("focus") ?? "";
		const toFocusItem = board.items.getById(toFocusId);
		if (toFocusItem) {
			const mbr = toFocusItem.getMbr();
			mbr.left -= 50;
			mbr.top -= 50;
			mbr.right += 50;
			mbr.bottom += 50;
			board.camera.zoomToFit(mbr);
		}
		board.camera.setBoardId(board.getBoardId());
		board.camera.useSavedSnapshot();
	}

	function addEvent(event: BoardEvent): void {
		if (event.order <= latestServerOrder) {
			return;
		}
		const eventUserId = parseFloat(event.body.eventId.split(":")[0]);
		const currentUserId = getUserId();

		const isEventFromCurrentUser = eventUserId === currentUserId;
		if (!isEventFromCurrentUser) {
			log.insertEvents(event);
			subject.publish(event);
		} else {
			log.setEventOrder(event);
		}
		latestServerOrder = event.order;
	}

	function emit(operation: Operation, command: Command): void {
		const userId = getUserId();
		const body = {
			eventId: getNextEventId(),
			userId,
			boardId: board.getBoardId(),
			operation: operation,
		} as BoardEventBody;
		const event = { order: 0, body };
		const record = { event, command };
		log.push(record);
		setLatestUserEvent(operation, userId);
		connection.publishBoardEvent(board.getBoardId(), event);
		subject.publish(event);
	}

	function republishEvents(): void {
		const unordered = log.getUnorderedRecords();
		for (const record of unordered) {
			connection.publishBoardEvent(board.getBoardId(), record.event);
		}
	}

	function apply(operation: EventsOperation): void | false {
		switch (operation.method) {
			case "undo":
				return applyUndo(operation.eventId);
			case "redo":
				return applyRedo(operation.eventId);
			default:
				return false;
		}
	}

	let eventCounter = 0;

	function getNextEventId(): string {
		const id = ++eventCounter;
		const userId = getUserId();
		return userId + ":" + id;
	}

	function applyUndo(updateLocalId: string): void {
		const record = log.getRecordById(updateLocalId);
		if (!record) {
			return;
		}
		record.command.revert();
	}

	function undo(apply = true): void {
		const currentUserId = getUserId();
		const record = log.getUndoRecord(currentUserId);
		if (!record) {
			return;
		}
		const { operation, userId, eventId } = record.event.body;
		const canUndo = canUndoEvent(operation, userId);
		if (!canUndo) {
			return;
		}
		const undoOp: EventsOperation = {
			class: "Events",
			method: "undo",
			eventId,
		};
		const command = new EventsCommand(instance, undoOp);
		if (apply) {
			command.apply();
		}
		emit(undoOp, command);
	}

	function applyRedo(updateLocalId: string): void {
		const record = log.getRecordById(updateLocalId);
		if (!record) {
			return;
		}
		if (record.event.body.operation.method === "undo") {
			const undoable = log.getRecordById(
				record.event.body.operation.eventId,
			);
			undoable?.command.apply();
		} else {
			record.command.revert();
		}
	}

	function redo(apply = true): void {
		const userId = getUserId();
		const record = log.getRedoRecord(userId);
		if (!record) {
			return;
		}
		const operation: EventsOperation = {
			class: "Events",
			method: "redo",
			eventId: record.event.body.eventId,
		};
		const command = new EventsCommand(instance, operation);
		if (apply) {
			command.apply();
		}
		emit(operation, command);
	}

	function canUndoEvent(op: Operation, byUserId?: number): boolean {
		if (op.method === "undo") {
			return false;
		}
		const isRedoPasteOrDuplicate =
			op.method === "redo" ||
			op.method === "paste" ||
			op.method === "duplicate";
		if (isRedoPasteOrDuplicate) {
			return true;
		}
		const key = `${op.method}_${op.item}`;
		const latest = latestEvent[key];
		return byUserId === undefined || byUserId === latest;
	}

	function setLatestUserEvent(op: Operation, userId: number): void {
		if (
			op.class !== "Events" &&
			op.method !== "paste" &&
			op.method !== "duplicate"
		) {
			latestEvent[`${op.method}_${op.item}`] = userId;
		}
	}

	function canUndo(): boolean {
		const userId = getUserId();
		const record = log.getUndoRecord(userId);
		if (!record) {
			return false;
		}
		return canUndoEvent(
			record.event.body.operation,
			record.event.body.userId,
		);
	}

	function canRedo(): boolean {
		const userId = getUserId();
		const record = log.getRedoRecord(userId);
		return record !== null;
	}

	function getUserId(): number {
		return connection.connectionId;
	}

	const instance: Events = {
		subject,
		serialize,
		deserialize,
		getSnapshot,
		disconnect,
		emit,
		apply,
		undo,
		redo,
		canUndo,
		canRedo,
	};

	return instance;
}
