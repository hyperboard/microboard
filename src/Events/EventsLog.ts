import { Board, BoardSnapshot } from "Board/Board";
import { Command, createCommand } from "./Command";
import { mergeOperations } from "./Merge";
import { Operation } from "./EventsOperations";
import { BoardOps } from "Board/BoardOperations";
import {
	BoardEvent,
	BoardEventPack,
	SyncBoardEvent,
	SyncEvent,
} from "./Events";
import { createSyncLog, SyncLog, SyncLogSubject } from "./SyncLog";
import { transfromOperation } from "./Transform";
import { TransformConnectorHelper } from "./TransforHelper";

export interface HistoryRecord {
	event: BoardEvent;
	command: Command;
}

export interface RawHistoryRecords {
	confirmedRecords: HistoryRecord[];
	recordsToSend: HistoryRecord[];
	newRecords: HistoryRecord[];
}

export interface EventsLog {
	getList(): HistoryRecord[];
	revertUnconfirmed(): void;
	applyUnconfirmed(): void;
	getRaw(): RawHistoryRecords;
	insertEventsFromOtherConnections(
		// events: BoardEvent | BoardEventPack | (BoardEvent | BoardEventPack)[],
		events: SyncEvent | SyncEvent[],
	): void;
	insertNewLocalEventRecordAfterEmit(record: HistoryRecord): HistoryRecord;
	getUnorderedRecords(): HistoryRecord[];
	getUndoRecord(userId: number): HistoryRecord | null;
	getRedoRecord(userId: number): HistoryRecord | null;
	getRecordById(id: string): HistoryRecord | undefined;
	serialize(): BoardEvent[];
	deserialize(events: BoardEvent[]): void;
	deserializeAndApply(events: BoardEvent[]): void;
	setSnapshotLastIndex(index: number): void;
	getSnapshot(): BoardSnapshot;
	getUnpublishedEvent(): BoardEventPack | null;
	confirmSentLocalEvent(event: BoardEvent | BoardEventPack): void;
	getLastIndex(): number;
	getLastConfirmed(): BoardEvent | null;
	getSyncLog(): SyncLog;
	syncLogSubject: SyncLogSubject;
	replay(events: BoardEvent[]): void;
	clear: () => void;
	clearConfirmed: () => void;
}

interface EventsList {
	addConfirmedRecords(records: HistoryRecord[]): void;
	addNewRecords(records: HistoryRecord[]): void;
	confirmSentRecords(records: BoardEvent[]): void;
	getConfirmedRecords(): HistoryRecord[];
	getRecordsToSend(): HistoryRecord[];
	getNewRecords(): HistoryRecord[];
	getAllRecords(): HistoryRecord[];
	prepareRecordsToSend(): HistoryRecord[];
	forwardIterable(): Iterable<HistoryRecord>;
	backwardIterable(): Iterable<HistoryRecord>;
	revertUnconfirmed(): void;
	applyUnconfirmed(): void;
	justConfirmed: HistoryRecord[];
	getSyncLog(): SyncLog;
	syncLogSubject: SyncLogSubject;
	clear(): void;
	clearConfirmedRecords(): void;
	removeUnconfirmedEventsByItems(itemIds: string[]): void;
	isAllEventsConfirmed(): boolean;
}

function createEventsList(
	createCommand: (BoardOps) => Command,
	board,
): EventsList {
	const confirmedRecords: HistoryRecord[] = [];
	const recordsToSend: HistoryRecord[] = [];
	const newRecords: HistoryRecord[] = [];

	const justConfirmed: HistoryRecord[] = [];

	const { log: syncLog, subject: syncLogSubject } = createSyncLog();

	function revert(records: HistoryRecord[]): void {
		for (const record of records) {
			record.command.revert();
		}
	}

	function apply(records: HistoryRecord[]): void {
		for (const record of records) {
			record.command = createCommand(record.event.body.operation);
			record.command.apply();
		}
	}

	function shouldRemoveEvent(
		operation: Operation,
		itemIds: string[],
	): boolean {
		if (operation.method === "add" && operation.class === "Board") {
			return itemIds.includes(operation.item);
		}

		if (operation.method === "remove" && operation.class === "Board") {
			return operation.item.some(id => itemIds.includes(id));
		}

		return false;
	}
	function mergeAndPushConfirmedRecords(records: HistoryRecord[]): void {
		const lastConfirmedRecord = confirmedRecords.pop();
		const recordsToMerge = lastConfirmedRecord
			? [lastConfirmedRecord, ...records]
			: records;
		const mergedRecords = mergeRecords(recordsToMerge);
		confirmedRecords.push(...mergedRecords);
	}
	return {
		isAllEventsConfirmed(): boolean {
			return newRecords.length === 0 && recordsToSend.length === 0;
		},

		addConfirmedRecords(records: HistoryRecord[]): void {
			syncLog.push({
				msg: "confirmed",
				records: [...records],
			});
			mergeAndPushConfirmedRecords(records);
			// confirmedRecords.push(...records);
		},

		addNewRecords(records: HistoryRecord[]): void {
			for (const record of records) {
				if (newRecords.length > 0) {
					const lastRecord = newRecords[newRecords.length - 1];
					const mergedOperation = mergeOperations(
						lastRecord.event.body.operation,
						record.event.body.operation,
					);

					if (mergedOperation) {
						lastRecord.event = createMergedEvent(
							lastRecord.event,
							mergedOperation,
						);
						lastRecord.command = createCommand(mergedOperation);
						continue;
					}
				}

				syncLog.push({
					msg: "addedNew",
					records: [record],
				});
				newRecords.push(record);
			}
		},

		confirmSentRecords(events: BoardEvent[]): void {
			const records = recordsToSend;
			if (records.length !== events.length) {
				console.error("Mismatch between records and events length");
				return;
			}

			for (let i = 0; i < records.length; i++) {
				records[i].event.order = events[i].order;
			}

			syncLog.push({
				msg: "confirmed",
				records: [...records],
			});
			mergeAndPushConfirmedRecords(records);
			recordsToSend.splice(0, records.length);
		},

		getConfirmedRecords(): HistoryRecord[] {
			return confirmedRecords;
		},

		getRecordsToSend(): HistoryRecord[] {
			return recordsToSend;
		},

		getNewRecords(): HistoryRecord[] {
			return newRecords;
		},

		getAllRecords(): HistoryRecord[] {
			return [...confirmedRecords, ...recordsToSend, ...newRecords];
		},

		getSyncLog(): SyncLog {
			return syncLog;
		},

		syncLogSubject,
		justConfirmed,

		prepareRecordsToSend(): HistoryRecord[] {
			if (recordsToSend.length === 0 && newRecords.length > 0) {
				syncLog.push({
					msg: "toSend",
					records: [...newRecords],
				});
				recordsToSend.push(...newRecords);
				newRecords.length = 0;
			}
			return recordsToSend;
		},

		forwardIterable(): Iterable<HistoryRecord> {
			return {
				[Symbol.iterator]: function* () {
					yield* confirmedRecords;
					yield* recordsToSend;
					yield* newRecords;
				},
			};
		},

		backwardIterable(): Iterable<HistoryRecord> {
			return {
				[Symbol.iterator]: function* () {
					yield* newRecords.slice().reverse();
					yield* recordsToSend.slice().reverse();
					yield* confirmedRecords.slice().reverse();
				},
			};
		},

		revertUnconfirmed(): void {
			revert(newRecords.slice().reverse());
			revert(recordsToSend.slice().reverse());
			syncLog.push({
				msg: "revertUnconfirmed",
				records: [...recordsToSend, ...newRecords],
			});
		},

		applyUnconfirmed(): void {
			if (justConfirmed.length > 0) {
				console.log(
					"INSIDE OF IF, found some just confirmed",
					justConfirmed,
				);
				const transformedSend = transformEvents(
					justConfirmed.map(rec => rec.event),
					recordsToSend
						.slice()
						.reverse()
						.map(rec => rec.event),
					// board,
				);
				console.log("Transformed Send Events:", transformedSend);

				const transformedNew = transformEvents(
					justConfirmed.map(rec => rec.event),
					newRecords
						.slice()
						.reverse()
						.map(rec => rec.event),
					// board,
				);
				console.log("Transformed New Events:", transformedNew);

				const recsToSend = transformedSend.map(event => ({
					event,
					command: createCommand(event.body.operation),
				}));
				console.log("Records to Send:", recsToSend);

				const recsNew = transformedNew.map(event => ({
					event,
					command: createCommand(event.body.operation),
				}));
				console.log("New Records:", recsNew);

				recordsToSend.length = 0;
				recordsToSend.push(...recsToSend.reverse());
				newRecords.length = 0;
				newRecords.push(...recsNew.reverse());
				justConfirmed.length = 0;
			}
			apply(recordsToSend);
			apply(newRecords);
			syncLog.push({
				msg: "applyUnconfirmed",
				records: [...recordsToSend, ...newRecords],
			});
		},

		clear(): void {
			confirmedRecords.length = 0;
			recordsToSend.length = 0;
			newRecords.length = 0;
		},
		clearConfirmedRecords(): void {
			confirmedRecords.length = 0;
		},

		// FIXME: should filter unconfirmed events and not send them
		removeUnconfirmedEventsByItems(itemIds: string[]): void {
			const removedFromToSend = recordsToSend.filter(record =>
				shouldRemoveEvent(record.event.body.operation, itemIds),
			);
			if (removedFromToSend.length > 0) {
				const newRecordsToSend = recordsToSend.filter(
					record =>
						!shouldRemoveEvent(
							record.event.body.operation,
							itemIds,
						),
				);
				recordsToSend.length = 0;
				recordsToSend.push(...newRecordsToSend);
			}

			const removedFromNew = newRecords.filter(record =>
				shouldRemoveEvent(record.event.body.operation, itemIds),
			);
			if (removedFromNew.length > 0) {
				const newRecordsArray = newRecords.filter(
					record =>
						!shouldRemoveEvent(
							record.event.body.operation,
							itemIds,
						),
				);
				newRecords.length = 0;
				newRecords.push(...newRecordsArray);
			}

			// syncLog.push({
			// 	msg: "removedUnconfirmed",
			// 	records: [...removedFromToSend, ...removedFromNew],
			// });
		},
	};
}

export function createEventsLog(board: Board): EventsLog {
	const list = createEventsList(
		(ops: BoardOps) => createCommand(board, ops),
		board,
	);

	function serialize(): BoardEvent[] {
		const events = list.getConfirmedRecords().map(record => record.event);
		return events;
	}

	function getList(): HistoryRecord[] {
		return list.getAllRecords();
	}

	function getRaw(): RawHistoryRecords {
		return {
			confirmedRecords: list.getConfirmedRecords(),
			recordsToSend: list.getRecordsToSend(),
			newRecords: list.getNewRecords(),
		};
	}

	function deserialize(events: SyncBoardEvent[]): void {
		list.clear();

		for (const event of events) {
			const command = createCommand(board, event.body.operation);
			const record = { event, command };
			// command.apply();
			list.addConfirmedRecords([record]);
		}
	}

	function replay(events: SyncBoardEvent[]): void {
		list.clear();

		const bodyEvents = events.map(event => {
			return { body: event, order: event.order };
		});

		for (const event of bodyEvents) {
			const command = createCommand(board, event.body.operation);
			const record = { event, command };
			command.apply();
			list.addConfirmedRecords([record]);
		}
	}

	function deserializeAndApply(events: SyncBoardEvent[]): void {
		list.clear();

		for (const event of events) {
			if (event.body.operations && Array.isArray(event.body.operations)) {
				// Handle batch events: if there is an array of operations, iterate over each one.
				for (const op of event.body.operations) {
					// Create a new event object for this particular operation.
					const singleEvent: SyncBoardEvent = {
						...event,
						body: {
							...event.body,
							operation: op,
						},
					};
					const command = createCommand(board, op);
					const record = { event: singleEvent, command };
					command.apply();
					list.addConfirmedRecords([record]);
				}
			} else {
				// Handle single operation event.
				const command = createCommand(board, event.body.operation);
				const record = { event, command };
				command.apply();
				list.addConfirmedRecords([record]);
			}
		}
	}

	function getSnapshot(): BoardSnapshot {
		list.revertUnconfirmed();
		const events = serialize();
		const items = board.serialize();
		const lastIndex = getLatestOrder();
		const snapshot = {
			events,
			items,
			lastIndex,
		};
		list.applyUnconfirmed();
		return snapshot;
	}

	function getUnpublishedEvent(): BoardEventPack | null {
		const recordsToSend = list.prepareRecordsToSend();

		if (recordsToSend.length === 0) {
			return null;
		}

		const operationsWithEventIds = recordsToSend.map(record => ({
			...record.event.body.operation,
			actualId: record.event.body.eventId,
		}));

		const combinedEvent: BoardEventPack = {
			...recordsToSend[0].event,
			body: {
				...recordsToSend[0].event.body,
				operations: operationsWithEventIds,
			},
		};

		return combinedEvent;
	}

	let snapshotLastIndex = 0;
	function setSnapshotLastIndex(index: number): void {
		snapshotLastIndex = index;
	}

	function getLatestOrder(): number {
		const confirmedRecords = list.getConfirmedRecords();
		const lastConfirmedRecord =
			confirmedRecords[confirmedRecords.length - 1];

		if (!lastConfirmedRecord) {
			return snapshotLastIndex;
		}

		const lastConfirmedEventOrder = lastConfirmedRecord.event.order;
		if (snapshotLastIndex >= lastConfirmedEventOrder) {
			return snapshotLastIndex;
		}

		return lastConfirmedEventOrder;
	}

	function insertEventsFromOtherConnections(
		events: SyncEvent | SyncEvent[],
	): void {
		const eventArray = Array.isArray(events) ? events : [events];
		if (eventArray.length === 0) {
			return;
		}
		const expandedEvents = expandEvents(eventArray);
		handleEventsInsertion(expandedEvents);
	}

	function expandEvents(events: SyncEvent[]): SyncBoardEvent[] {
		return events.flatMap(event => {
			if ("operations" in event.body) {
				// Это BoardEventPack
				return event.body.operations.map(operation => ({
					order: event.order,
					body: {
						eventId: operation.actualId || event.body.eventId,
						userId: event.body.userId,
						boardId: event.body.boardId,
						operation,
					},
					lastKnownOrder:
						"lastKnownOrder" in event
							? event.lastKnownOrder
							: event.body.lastKnownOrder,
				}));
			} else {
				// Это обычный BoardEvent
				return [event as SyncBoardEvent];
			}
		});
	}

	// function handleEventsInsertion(events: BoardEvent[]): void {
	function handleEventsInsertion(events: SyncBoardEvent[]): void {
		list;
		const toDelete = TransformConnectorHelper.handleRemoveSnappedObject(
			board,
			events,
		);

		if (Array.isArray(toDelete) && toDelete.length > 0) {
			list.removeUnconfirmedEventsByItems(toDelete);
			toDelete.forEach(item => {
				board.apply({
					class: "Board",
					method: "remove",
					item: [item],
				});
			});
		}

		list.revertUnconfirmed();

		const transformed: BoardEvent[] = [];

		for (const event of events) {
			if (
				event.lastKnownOrder !== undefined &&
				event.lastKnownOrder + 1 < event.order
			) {
				const confirmed = [
					...list.getConfirmedRecords().map(rec => rec.event),
					...events,
				].filter(
					evnt =>
						evnt.body.eventId !== event.body.eventId &&
						evnt.order > event.lastKnownOrder &&
						evnt.order <= event.order,
				);
				// const transf = transformEvents(confirmed, [event], board);
				const transf = transformEvents(confirmed, [event]);
				transformed.push(...transf);
			} else {
				transformed.push(event);
			}
		}

		const mergedEvents = mergeEvents(transformed);
		for (const event of mergedEvents) {
			const command = createCommand(board, event.body.operation);
			const record = { event, command };
			command.apply();
			list.addConfirmedRecords([record]);
			list.justConfirmed.push(record);
		}
		list.applyUnconfirmed();
	}

	// TODO: rethink this function
	function confirmSentLocalEvent(event: BoardEventPack): void {
		const events = expandEvents([event]);
		list.confirmSentRecords(events);
	}

	function insertNewLocalEventRecordAfterEmit(
		record: HistoryRecord,
	): HistoryRecord {
		list.addNewRecords([record]);
		return record;
	}

	function getTimeStamp(rec: HistoryRecord): number | undefined {
		return (
			("timeStamp" in rec.event.body.operation &&
				rec.event.body.operation.timeStamp) ||
			undefined
		);
	}

	function createTimeStampAmountMap(
		records: Iterable<HistoryRecord>,
		filter?: (rec: HistoryRecord) => boolean,
	): Map<number, number> {
		const timeStampMap = new Map<number, number>();

		for (const record of records) {
			if (filter && !filter(record)) {
				continue;
			}
			const timeStamp = getTimeStamp(record);
			if (timeStamp) {
				const currAmount = timeStampMap.get(timeStamp) || 0;
				timeStampMap.set(timeStamp, currAmount + 1);
			}
		}
		return timeStampMap;
	}

	function getUnorderedRecords(): HistoryRecord[] {
		return list.getRecordsToSend().concat(list.getNewRecords());
	}

	function getUndoRecord(userId: number): HistoryRecord | null {
		let counter = 0;

		/*
		const timeStampMap = createTimeStampAmountMap(
			list.backwardIterable(),
			rec => rec.event.body.userId === userId,
		);
		*/

		const isAllEventsConfirmed = list.isAllEventsConfirmed();

		if (!isAllEventsConfirmed) {
			return null;
		}

		for (const record of list.getConfirmedRecords().slice().reverse()) {
			const shouldSkip =
				record.event.body.userId !== userId ||
				record.event.body.operation.method === "updateVideoData" ||
				(record.event.body.operation.class === "Audio" &&
					record.event.body.operation.method === "setUrl");
			if (shouldSkip) {
				continue;
			}

			if (record.event.body.operation.method === "undo") {
				const undid = getRecordById(
					record.event.body.operation.eventId,
				);
				/*
				const stamp = undid && getTimeStamp(undid);
				if (stamp) {
					const mappedAmount = timeStampMap.get(stamp);
					counter += mappedAmount || 1;
				} else {
				*/
				counter++;
				// }
			} else if (counter === 0) {
				return record;
			} else {
				counter--;
			}
		}

		return null;
	}

	function getRedoRecord(userId: number): HistoryRecord | null {
		let counter = 0;

		for (const record of list.backwardIterable()) {
			const shouldSkip =
				record.event.body.userId !== userId ||
				record.event.body.operation.method === "updateVideoData" ||
				(record.event.body.operation.class === "Audio" &&
					record.event.body.operation.method === "setUrl");
			if (shouldSkip) {
				continue;
			}

			if (
				record.event.body.operation.method !== "undo" &&
				record.event.body.operation.method !== "redo"
			) {
				return null;
			}

			const { method } = record.event.body.operation;

			if (method === "redo") {
				counter++;
			} else if (method === "undo") {
				if (counter > 0) {
					counter--;
				} else if (counter === 0) {
					return record;
				}
			}
		}

		return null;
	}

	function mergeRecordsByTimestamp(
		timeStamp: number,
	): HistoryRecord | undefined {
		const toMerge: BoardEvent[] = [];
		for (const record of list.forwardIterable()) {
			if (
				"timeStamp" in record.event.body.operation &&
				record.event.body.operation.timeStamp === timeStamp
			) {
				toMerge.push(record.event);
			}
		}
		const merged = mergeEvents(toMerge);
		if (merged.length === 1) {
			const event = merged[0];
			const command = createCommand(board, event.body.operation);
			const record = { event, command };
			return record;
		}
		return undefined;
	}

	function getRecordById(id: string): HistoryRecord | undefined {
		for (const record of list.forwardIterable()) {
			if (record.event.body.eventId === id) {
				/*
				const timeStamp = getTimeStamp(record);
				if (timeStamp) {
					const mergedRecord = mergeRecordsByTimestamp(timeStamp);
					return mergedRecord ?? record;
				}
				*/
				return record;
			}
		}
		return;
	}

	function getLastConfirmed(): BoardEvent | null {
		const records = list.getConfirmedRecords();
		if (records.length === 0) {
			return null;
		}
		return records[records.length - 1].event;
	}

	return {
		// Inserts new events into the events log, handling transformations and merging
		insertEventsFromOtherConnections,

		// Adds a new record to the events log
		insertNewLocalEventRecordAfterEmit,

		// Confirms events that have been sent, updating their status in the log
		confirmSentLocalEvent: confirmSentLocalEvent,

		// Retrieves the complete list of all history records (confirmed, to-send, and new)
		getList,

		// Returns raw history records categorized into confirmed, to-send, and new records
		getRaw,

		// Retrieves the synchronization log for tracking event changes
		getSyncLog: list.getSyncLog,

		// Subject for synchronization log events, allowing subscription to log changes
		syncLogSubject: list.syncLogSubject,

		// Reverts all unconfirmed events (records to send and new records) in reverse order
		revertUnconfirmed: list.revertUnconfirmed,

		// Applies all unconfirmed events, transforming them if necessary
		applyUnconfirmed: list.applyUnconfirmed,

		// Retrieves unordered records (records to send and new records)
		getUnorderedRecords,

		// Finds the most recent undoable record for a specific user
		getUndoRecord,

		// Finds the most recent redoable record for a specific user
		getRedoRecord,

		// Retrieves a specific record by its event ID
		getRecordById,

		// Serializes confirmed events into a format that can be stored or transmitted
		serialize,

		// Deserializes events and adds them to the confirmed records
		deserialize,

		// Deserializes events, applies them to the board, and adds them to confirmed records
		deserializeAndApply,

		// Sets the last known index for snapshots
		setSnapshotLastIndex,

		// Creates a snapshot of the current board state, including events and items
		getSnapshot,

		// Retrieves unpublished events ready to be sent
		getUnpublishedEvent,

		// Gets the latest event order, considering both confirmed events and snapshot index
		getLastIndex: getLatestOrder,

		// Retrieves the most recently confirmed event
		getLastConfirmed,

		// Completely clears all records from the events log
		clear: list.clear,

		// Clears only the confirmed records from the events log
		clearConfirmed: list.clearConfirmedRecords,

		// Replays a series of events, applying them in order
		replay,
	};
}

function mergeRecords(records: HistoryRecord[]): HistoryRecord[] {
	if (records.length < 2) {
		return records;
	}

	const mergedRecords: HistoryRecord[] = [];
	let previous: HistoryRecord | null = null;

	for (const record of records) {
		if (!previous) {
			previous = record;
			continue;
		}

		const mergedEventOperation = mergeOperations(
			previous.event.body.operation,
			record.event.body.operation,
		);

		if (!mergedEventOperation) {
			mergedRecords.push(previous);
			previous = record;
		} else {
			const mergedCommand = record.command.merge
				? previous.command.merge(mergedEventOperation)
				: previous.command;

			previous = {
				event: {
					...record.event,
					body: {
						...record.event.body,
						operation: mergedEventOperation,
					},
				},
				command: mergedCommand,
			};
		}
	}

	if (previous) {
		mergedRecords.push(previous);
	}

	return mergedRecords;
}

function createMergedRecord(
	record: HistoryRecord,
	mergedEventOperation: Operation,
	mergedCommandOperation: Operation,
	mergedCommandReverse: Operation,
): HistoryRecord {
	return;
}

/**
 * Объединяет последовательность событий доски, сливая операции, где это возможно.
 *
 * @param events - Массив событий доски для объединения.
 * @returns Массив объединенных событий доски.
 *
 * Функция проходит по массиву событий и пытается объединить каждое событие
 * с предыдущим. Если операции событий можно объединить, создается новое
 * объединенное событие. Если нет, предыдущее событие добавляется к результату
 * без изменений. Эта функция помогает оптимизировать историю событий,
 * уменьшая количество отдельных операций там, где это возможно.
 */
// function mergeEvents(events: SyncBoardEvent[]): SyncBoardEvent[] {
function mergeEvents(events: BoardEvent[]): BoardEvent[] {
	if (events.length < 2) {
		return events;
	}

	// const mergedEvents: SyncBoardEvent[] = [];
	// let previous: SyncBoardEvent | null = null;
	const mergedEvents: BoardEvent[] = [];
	let previous: BoardEvent | null = null;

	for (const event of events) {
		if (!previous) {
			previous = event;
			continue;
		}

		const mergedOperation = mergeOperations(
			previous.body.operation,
			event.body.operation,
		);

		if (!mergedOperation) {
			mergedEvents.push(previous);
			previous = event;
		} else {
			previous = createMergedEvent(event, mergedOperation);
		}
	}

	if (previous) {
		mergedEvents.push(previous);
	}

	return mergedEvents;
}

function createMergedEvent(
	event: BoardEvent,
	mergedOperation: Operation,
): BoardEvent {
	return {
		...event,
		body: {
			...event.body,
			operation: mergedOperation,
		},
	};
}

export function transformEvents(
	confirmed: BoardEvent[],
	toTransform: BoardEvent[],
	// board,
): BoardEvent[] {
	const transformed: BoardEvent[] = [];

	for (const transf of toTransform) {
		let actualyTransformed = { ...transf };

		for (const conf of confirmed) {
			const { operation: confOp } = conf.body;
			const { operation: transfOp } = actualyTransformed.body;

			// const transformedOp = transfromOperation(confOp, transfOp, board);
			const transformedOp = transfromOperation(confOp, transfOp);
			if (transformedOp) {
				actualyTransformed = {
					...actualyTransformed,
					body: {
						...actualyTransformed.body,
						operation: transformedOp,
					},
				};
			}
		}
		transformed.push(actualyTransformed);
	}

	return transformed;
}
