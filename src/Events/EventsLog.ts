import { Board, BoardSnapshot } from "Board/Board";
import { Command, createCommand } from "./Command";
import { mergeOperations } from "./Merge";
import { Operation } from "./EventsOperations";
import { BoardOps } from "Board/BoardOperations";
import { BoardEvent, BoardEventPack } from "./Events";

export interface HistoryRecord {
	event: BoardEvent;
	command: Command;
}

export interface EventsLog {
	getList(): HistoryRecord[];
	insertEvents(
		events: BoardEvent | BoardEventPack | (BoardEvent | BoardEventPack)[],
	): void;
	push(record: HistoryRecord): HistoryRecord;
	getUnorderedRecords(): HistoryRecord[];
	getUndoRecord(userId: number): HistoryRecord | null;
	getRedoRecord(userId: number): HistoryRecord | null;
	getRecordById(id: string): HistoryRecord | undefined;
	serialize(): BoardEvent[];
	deserialize(events: BoardEvent[]): void;
	getSnapshot(): BoardSnapshot;
	getUnpublishedEvent(): BoardEventPack | null;
	confirmEvent(event: BoardEvent | BoardEventPack): void;
	getLatestOrder(): number;
	getLastConfirmed(): BoardEvent | null;
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
	clear(): void;
}

function createEventsList(createCommand: (BoardOps) => Command): EventsList {
	const confirmedRecords: HistoryRecord[] = [];
	const recordsToSend: HistoryRecord[] = [];
	const newRecords: HistoryRecord[] = [];

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

	return {
		addConfirmedRecords(records: HistoryRecord[]): void {
			confirmedRecords.push(...records);
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

			confirmedRecords.push(...records);
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

		prepareRecordsToSend(): HistoryRecord[] {
			if (recordsToSend.length === 0 && newRecords.length > 0) {
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
			revert(newRecords.reverse());
			revert(recordsToSend.reverse());
		},

		applyUnconfirmed(): void {
			apply(recordsToSend);
			apply(newRecords);
		},

		clear(): void {
			confirmedRecords.length = 0;
			recordsToSend.length = 0;
			newRecords.length = 0;
		},
	};
}

export function createEventsLog(board: Board): EventsLog {
	const list = createEventsList((ops: BoardOps) => createCommand(board, ops));

	function serialize(): BoardEvent[] {
		const events = list.getConfirmedRecords().map(record => record.event);
		return events;
	}

	function getList(): HistoryRecord[] {
		return list.getAllRecords();
	}

	function deserialize(events: BoardEvent[]): void {
		list.clear();
		const records: HistoryRecord[] = [];
		for (const event of events) {
			const command = createCommand(board, event.body.operation);
			const record = { event, command };
			command.apply();
			records.push(record);
		}
		list.addConfirmedRecords(records);
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

		const operations = recordsToSend.map(
			record => record.event.body.operation,
		);

		const combinedEvent: BoardEventPack = {
			...recordsToSend[0].event,
			body: {
				...recordsToSend[0].event.body,
				operations: operations,
			},
		};

		return combinedEvent;
	}

	function getLatestOrder(): number {
		const confirmedRecords = list.getConfirmedRecords();
		return confirmedRecords.length > 0
			? confirmedRecords[confirmedRecords.length - 1].event.order
			: 0;
	}

	function insertEvents(
		events: BoardEvent | BoardEventPack | (BoardEvent | BoardEventPack)[],
	): void {
		const eventArray = Array.isArray(events) ? events : [events];
		if (eventArray.length === 0) {
			return;
		}
		const expandedEvents = expandEvents(eventArray);
		handleEventsInsertion(expandedEvents);
	}

	function expandEvents(
		events: (BoardEvent | BoardEventPack)[],
	): BoardEvent[] {
		return events.flatMap(event => {
			if ("operations" in event.body) {
				// Это BoardEventPack
				return event.body.operations.map(operation => ({
					order: event.order,
					body: {
						eventId: event.body.eventId,
						userId: event.body.userId,
						boardId: event.body.boardId,
						operation,
					},
				}));
			} else {
				// Это обычный BoardEvent
				return [event as BoardEvent];
			}
		});
	}

	function handleEventsInsertion(events: BoardEvent[]): void {
		list.revertUnconfirmed();
		const mergedEvents = mergeEvents(events);
		const records: HistoryRecord[] = [];
		for (const event of mergedEvents) {
			const command = createCommand(board, event.body.operation);
			const record = { event, command };
			command.apply();
			records.push(record);
		}
		list.addConfirmedRecords(records);
		list.applyUnconfirmed();
	}

	// TODO: rethink this function
	function confirmEvent(event: BoardEventPack): void {
		const events = expandEvents([event]);
		list.confirmSentRecords(events);
	}

	function push(record: HistoryRecord): HistoryRecord {
		list.addNewRecords([record]);
		return record;
	}

	function getUnorderedRecords(): HistoryRecord[] {
		return list.getRecordsToSend().concat(list.getNewRecords());
	}

	// TODO: handle merge of records at different stages
	function getUndoRecord(userId: number): HistoryRecord | null {
		let counter = 0;

		for (const record of list.backwardIterable()) {
			if (record.event.body.userId !== userId) {
				continue;
			}

			if (record.event.body.operation.method === "undo") {
				counter++;
			} else if (counter === 0) {
				return record;
			} else {
				counter--;
			}
		}

		return null;
	}

	// TODO: handle merge of records at different stages
	function getRedoRecord(userId: number): HistoryRecord | null {
		let counter = 0;

		for (const record of list.backwardIterable()) {
			if (
				record.event.body.operation.method !== "undo" &&
				record.event.body.operation.method !== "redo"
			) {
				return null;
			}

			if (record.event.body.userId !== userId) {
				continue;
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

	function getRecordById(id: string): HistoryRecord | undefined {
		for (const record of list.forwardIterable()) {
			if (record.event.body.eventId === id) {
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
		getList,
		insertEvents,
		confirmEvent,
		push,
		getUnorderedRecords,
		getUndoRecord,
		getRedoRecord,
		getRecordById,
		serialize,
		deserialize,
		getSnapshot,
		getUnpublishedEvent,
		getLatestOrder,
		getLastConfirmed,
	};
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
function mergeEvents(events: BoardEvent[]): BoardEvent[] {
	if (events.length < 2) {
		return events;
	}

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
