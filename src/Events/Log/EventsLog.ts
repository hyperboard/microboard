import { Board, BoardSnapshot } from 'Board';
import { BoardOps } from 'BoardOperations';
import { BoardEvent, BoardEventPack, SyncBoardEvent, SyncEvent } from '../Events';
import { createEventsList, EventsList } from './createEventsList';
import { Command } from 'Plugin';
import { createCommand } from '../Command';
import { getRecordByIdFromList } from './getRecordByIdFromList';
import { getRedoRecordFromList } from './getRedoRecordFromList';
import { getUndoRecordFromList } from './getUndoRecordFromList';
import { getUnpublishedEventFromList } from './getUnpublishedEventFromList';
import { insertEventsFromOtherConnectionsIntoList } from './insertEventsFromOtherConnectionsIntoList';
import { expandEvents } from './expandEvents';
import { deserializeAndApplyToList } from './deserializeAndApplyToList';
import { deserializeIntoList } from './deserializeIntoList';
import { getLastIndexFromList } from './getLastIndexFromList';
import { getSnapshotFromList } from './getSnapshotFromList';

export interface HistoryRecord {
	event: BoardEvent;
	command: Command;
}

export interface RawHistoryRecords {
	confirmedRecords: HistoryRecord[];
	recordsToSend: HistoryRecord[];
	newRecords: HistoryRecord[];
}

/**
 * Manages the board's event log, handling event recording, synchronization, and history management
 */
export class EventsLog {
	list: EventsList;
	private board: Board;

	currentSequenceNumber = 0;
	pendingEvent: {
		event: BoardEventPack;
		sequenceNumber: number;
		lastSentTime: number;
	} | null = null;
	firstSentTime: number | null = null;
	publishIntervalTimer: NodeJS.Timeout | null = null;
	resendIntervalTimer: NodeJS.Timeout | null = null;
	saveFileTimeout: NodeJS.Timeout | null = null;

	constructor(board: Board) {
		this.board = board;
		this.list = createEventsList((ops: BoardOps) => createCommand(board, ops));
	}

	/**
	 * Inserts new events into the events log, handling transformations and merging
	 */
	insertEventsFromOtherConnections(events: SyncEvent | SyncEvent[]): void {
		insertEventsFromOtherConnectionsIntoList(events, this.list, this.board);
	}

	/**
	 * Adds a new record to the events log
	 */
	insertNewLocalEventRecordAfterEmit(record: HistoryRecord): HistoryRecord {
		this.list.addNewRecords([record]);
		return record;
	}

	/**
	 * Confirms events that have been sent, updating their status in the log
	 * Note: Implementation treats the parameter as BoardEventPack
	 */
	confirmSentLocalEvent(event: BoardEvent | BoardEventPack): void {
		const events = expandEvents([event]);
		this.list.confirmSentRecords(events);
	}

	/**
	 * Retrieves unordered records (records to send and new records)
	 */
	getUnorderedRecords(): HistoryRecord[] {
		return this.list.getRecordsToSend().concat(this.list.getNewRecords());
	}

	/**
	 * Finds the most recent undoable record for a specific user
	 */
	getUndoRecord(userId: number): HistoryRecord | null {
		return getUndoRecordFromList(userId, this.list);
	}

	/**
	 * Finds the most recent redoable record for a specific user
	 */
	getRedoRecord(userId: number): HistoryRecord | null {
		return getRedoRecordFromList(userId, this.list);
	}

	/**
	 * Retrieves a specific record by its event ID
	 */
	getRecordById(id: string): HistoryRecord | undefined {
		return getRecordByIdFromList(id, this.list);
	}

	/**
	 * Deserializes events and adds them to the confirmed records
	 * Note: Implementation uses SyncBoardEvent[] rather than BoardEvent[]
	 */
	deserialize(events: SyncBoardEvent[]): void {
		deserializeIntoList(events, this.list, this.board);
	}

	/**
	 * Deserializes events, applies them to the board, and adds them to confirmed records
	 * Note: Implementation uses SyncBoardEvent[] rather than BoardEvent[]
	 */
	deserializeAndApply(events: SyncBoardEvent[]): void {
		deserializeAndApplyToList(events, this.list, this.board);
	}

	/**
	 * Creates a snapshot of the current board state, including events and items
	 */
	getSnapshot(): BoardSnapshot {
		return getSnapshotFromList(this.list, this.board);
	}

	/**
	 * Retrieves unpublished events ready to be sent
	 */
	getUnpublishedEvent(): BoardEventPack | null {
		return getUnpublishedEventFromList(this.list);
	}

	/**
	 * Gets the latest event order, considering both confirmed events and snapshot index
	 */
	getLastIndex(): number {
		return getLastIndexFromList(this.list);
	}

	/**
	 * Retrieves the most recently confirmed event
	 */
	getLastConfirmed(): BoardEvent | null {
		const records = this.list.getConfirmedRecords();
		if (records.length === 0) {
			return null;
		}
		return records[records.length - 1].event;
	}
}

export function createEventsLog(board: Board): EventsLog {
	return new EventsLog(board);
}
