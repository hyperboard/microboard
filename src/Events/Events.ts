import { Connection } from 'App/Connection';
import { Board } from 'Board';
import { Subject } from 'Subject';
import { Command, createCommand } from './Command';
import { createEventsLog, EventsLog } from './Log';
import { Operation } from './EventsOperations';
import { PresenceEventType } from 'Presence/Events';
import { conf } from 'Settings';

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

export interface BoardEventPack {
	order: number;
	body: BoardEventPackBody;
}

export interface BoardEventPackBody {
	eventId: string;
	userId: number;
	boardId: string;
	operations: (Operation & { actualId?: string })[];
}

export interface SyncBoardEvent extends BoardEvent {
	lastKnownOrder: number;
	userId: string;
}

interface SyncBoardEventPackBody extends BoardEventPackBody {
	lastKnownOrder: number;
}
export interface SyncBoardEventPack extends BoardEventPack {
	body: SyncBoardEventPackBody;
}

export type SyncEvent = SyncBoardEvent | SyncBoardEventPack;

export class Events {
	subject: Subject<BoardEvent>;
	log: EventsLog;
	board: Board;
	connection: Connection | undefined;
	private latestEvent: { [key: string]: number } = {};
	private eventCounter = 0;

	constructor(board: Board, connection: Connection | undefined, lastIndex: number) {
		this.board = board;
		this.connection = connection;
		this.log = createEventsLog(board);
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
		const userId = this.getUserId();
		const body = {
			eventId: this.getNextEventId(),
			userId,
			boardId: this.board.getBoardId(),
			operation: operation,
		} as BoardEventBody;
		const event = { order: 0, body };
		const record = {
			event,
			command: command || createCommand(this.board, operation),
		};
		this.log.insertNewLocalEventRecordAfterEmit(record);
		this.setLatestUserEvent(operation, userId);
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
		const cmd = createCommand(this.board, operation);
		cmd.apply();
		this.emit(operation, cmd);
	}

	/**
	 * Undoes the last operation performed by the current user
	 * @param apply Whether to apply the undo operation (defaults to true)
	 */
	undo(): void {
		const currentUserId = this.getUserId();
		const record = this.log.getUndoRecord(currentUserId);
		if (!record) {
			return;
		}
		const { operation, userId, eventId } = record.event.body;
		const canUndo = this.canUndoEvent(operation, userId);
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
		const userId = this.getUserId();
		const record = this.log.getRedoRecord(userId);
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
		const userId = this.getUserId();
		const record = this.log.getUndoRecord(userId);
		if (!record) {
			return false;
		}
		return this.canUndoEvent(record.event.body.operation, record.event.body.userId);
	}

	/**
	 * Checks if there's an operation that can be redone by the current user
	 * @returns Whether a redo operation is possible
	 */
	canRedo(): boolean {
		const userId = this.getUserId();
		const record = this.log.getRedoRecord(userId);
		return record !== null;
	}

	/**
	 * Publishes a presence event to notify other users about activity on the board
	 * @param event The presence event to publish
	 */
	sendPresenceEvent(event: PresenceEventType): void {
		conf.connection.publishPresenceEvent(this.board.getBoardId(), event);
	} // TODO Switch to pulling from connection instead of pushing from presence, then remove this method

	private canUndoEvent(op: Operation, byUserId?: number): boolean {
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
		return byUserId === undefined || byUserId === latest;
	}

	private setLatestUserEvent(op: Operation, userId: number): void {
		if (op.class !== 'Events' && op.method !== 'paste' && op.method !== 'duplicate') {
			const key = this.getOpKey(op);
			this.latestEvent[key] = userId;
		}
	}

	private getOpKey(op: Operation): string {
		// return "item" in op ? `${op.method}_${op.item}` : op.method;
		return op.method;
	}

	private getUserId(): number {
		return this.connection?.connectionId || 0;
	}

	private getNextEventId(): string {
		const id = ++this.eventCounter;
		const userId = this.getUserId();
		return userId + ':' + id;
	}
}

export function createEvents(
	board: Board,
	connection: Connection | undefined, // undefined for node or local
	lastIndex: number
): Events {
	return new Events(board, connection, lastIndex);
}
