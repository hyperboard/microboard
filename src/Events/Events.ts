import { Connection } from 'Settings';
import { Board } from 'Board';
import { Subject } from 'Subject';
import { Command } from './Command';
import { createEventsLog, EventsLog } from './Log';
import { Operation } from './EventsOperations';
import { PresenceEventType } from 'Presence/Events';
import { conf } from 'Settings';
import { createCommand } from './CreateCommand';
import {
	getBoardEventSessionId,
	getConnectionAuthorUserId,
	getConnectionSessionId,
	getConnectionSessionIds,
} from './identity';

export interface BoardEvent {
	order: number;
	body: BoardEventBody;
}

export interface BoardEventBody {
	eventId: string;
	userId?: number | string;
	authorUserId?: string;
	sessionId?: string;
	boardId: string;
	operation: Operation;
}

export interface BoardEventPack {
	order: number;
	body: BoardEventPackBody;
}

export interface BoardEventPackBody {
	eventId: string;
	userId?: number | string;
	authorUserId?: string;
	sessionId?: string;
	boardId: string;
	operations: (Operation & { actualId?: string })[];
}

export interface SyncBoardEvent extends BoardEvent {
	lastKnownOrder: number;
}

interface SyncBoardEventPackBody extends BoardEventPackBody {
	lastKnownOrder: number;
}
export interface SyncBoardEventPack extends BoardEventPack {
	body: SyncBoardEventPackBody;
}

export type SyncEvent = SyncBoardEvent | SyncBoardEventPack;

export class Events {
	static createCommand: (board: Board, operation: Operation) => Command;

	subject: Subject<BoardEvent>;
	log: EventsLog;
	board: Board;
	connection: Connection | undefined;
	private latestEvent: { [key: string]: string } = {};
	private eventCounter = 0;

	constructor(board: Board, connection: Connection | undefined, lastIndex: number) {
		this.board = board;
		this.connection = connection;
		this.log = createEventsLog(board, (ops: Operation) => Events.createCommand(board, ops));
		this.log.list.setSnapshotLastIndex(lastIndex);
		this.subject = new Subject<BoardEvent>();
		this.latestEvent = {};

		// Subscribe if connection exists
		connection?.subscribe(board);
	}

	/**
	 * Emits an operation event to the board's event system
	 * @param operation The operation to emit
	 * @param command Optional command associated with the operation
	 */
	emit(operation: Operation, command?: Command): void {
		if (operation.method === "transformMany") {
			console.error("[DEBUG] transformMany emitted from Events.emit!", JSON.stringify(operation));
			console.trace("[DEBUG] transformMany stack trace");
		}
			const sessionId = this.getSessionId();
			const authorUserId = this.getAuthorUserId();
			const body = {
				eventId: this.getNextEventId(),
				userId: sessionId,
				authorUserId,
				sessionId,
				boardId: this.board.getBoardId(),
				operation: operation,
			} as BoardEventBody;
		const event = { order: 0, body };
		const record = {
			event,
			command: command || Events.createCommand(this.board, operation),
		};
		this.log.insertNewLocalEventRecordAfterEmit(record);
			this.setLatestUserEvent(operation, sessionId);
			this.subject.publish(event);

		if (this.board.getBoardId().includes('local')) {
			if (this.log.saveFileTimeout) {
				clearTimeout(this.log.saveFileTimeout);
			}
			this.log.saveFileTimeout = setTimeout(async () => {
				if (this.board.saveEditingFile) {
					await this.board.saveEditingFile();
				}
				this.log.saveFileTimeout = null;
				this.subject.publish(event);
			}, 1000);
		}
	}

	/**
	 * Applies an operation and then emits the corresponding event
	 * @param operation The operation to apply and emit
	 */
	applyAndEmit(operation: Operation): void {
		const cmd = Events.createCommand(this.board, operation);
		cmd.apply();
		this.emit(operation, cmd);
	}

	/**
	 * Undoes the last operation performed by the current user
	 * @param apply Whether to apply the undo operation (defaults to true)
	 */
	undo(): void {
			const currentSessionIds = this.getSessionIds();
			const record = this.log.getUndoRecord(currentSessionIds);
		if (!record) {
			return;
		}
			const { operation, eventId } = record.event.body;
			const canUndo = this.canUndoEvent(operation, getBoardEventSessionId(record.event.body));
		if (!canUndo) {
			return;
		}
		this.applyAndEmit({
			class: 'Events',
			method: 'undo',
			eventId,
		});
	}

	/**
	 * Redoes a previously undone operation
	 * @param apply Whether to apply the redo operation (defaults to true)
	 */
	redo(): void {
			const sessionIds = this.getSessionIds();
			const record = this.log.getRedoRecord(sessionIds);
		if (!record) {
			return;
		}
		this.applyAndEmit({
			class: 'Events',
			method: 'redo',
			eventId: record.event.body.eventId,
		});
	}

	/**
	 * Checks if there's an operation that can be undone by the current user
	 * @returns Whether an undo operation is possible
	 */
	canUndo(): boolean {
			const sessionIds = this.getSessionIds();
			const record = this.log.getUndoRecord(sessionIds);
		if (!record) {
			return false;
		}
			return this.canUndoEvent(
				record.event.body.operation,
				getBoardEventSessionId(record.event.body),
			);
	}

	/**
	 * Checks if there's an operation that can be redone by the current user
	 * @returns Whether a redo operation is possible
	 */
	canRedo(): boolean {
			const sessionIds = this.getSessionIds();
			const record = this.log.getRedoRecord(sessionIds);
			return record !== null;
	}

	/**
	 * Publishes a presence event to notify other users about activity on the board
	 * @param event The presence event to publish
	 */
	sendPresenceEvent(event: PresenceEventType): void {
		conf.connection.publishPresenceEvent(this.board.getBoardId(), event);
	} // TODO Switch to pulling from connection instead of pushing from presence, then remove this method

	private canUndoEvent(op: Operation, bySessionId?: string): boolean {
		if (op.method === 'undo') {
			return false;
		}
		const isRedoPasteOrDuplicate =
			op.method === 'redo' || op.method === 'paste' || op.method === 'duplicate';
		if (isRedoPasteOrDuplicate) {
			return true;
		}
			const key = this.getOpKey(op);
			const latest = this.latestEvent[key];
			return bySessionId === undefined || bySessionId === latest;
	}

	private setLatestUserEvent(op: Operation, sessionId: string): void {
		if (op.class !== 'Events' && op.method !== 'paste' && op.method !== 'duplicate') {
			const key = this.getOpKey(op);
			this.latestEvent[key] = sessionId;
		}
	}

	private getOpKey(op: Operation): string {
		// return "item" in op ? `${op.method}_${op.item}` : op.method;
		return op.method;
	}

	private getSessionId(): string {
		return getConnectionSessionId(this.connection);
	}

	private getSessionIds(): string[] {
		return getConnectionSessionIds(this.connection);
	}

	private getAuthorUserId(): string | undefined {
		return getConnectionAuthorUserId(this.connection);
	}

	private getNextEventId(): string {
		const id = ++this.eventCounter;
		const sessionId = this.getSessionId();
		return sessionId + ':' + id;
	}
}

export function createEvents(
	board: Board,
	connection: Connection | undefined, // undefined for node or local
	lastIndex: number
): Events {
	return new Events(board, connection, lastIndex);
}

Events.createCommand = createCommand;
