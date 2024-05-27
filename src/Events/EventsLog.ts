import { Board, BoardSnapshot } from "Board/Board";
import { Command, createCommand } from "./Command";
import { BoardEvent } from "./Events";
import { Operation } from "./EventsOperations";
import { mergeOperations } from "./Merge";

export interface HistoryRecord {
	event: BoardEvent;
	command: Command;
}

export interface EventsLog {
	list: HistoryRecord[];
	insertEvents(events: BoardEvent | BoardEvent[]): void;
	setEventOrder(event: BoardEvent): void;
	push(record: HistoryRecord): HistoryRecord;
	getUnorderedRecords(): HistoryRecord[];
	getUndoRecord(userId: number): HistoryRecord | null;
	getRedoRecord(userId: number): HistoryRecord | null;
	getRecordById(id: string): HistoryRecord | undefined;
	serialize(): BoardEvent[];
	deserialize(events: BoardEvent[]): void;
	getSnapshot(): BoardSnapshot;
}

export function createEventsLog(board: Board): EventsLog {
	let list: HistoryRecord[] = [];

	function serialize(): BoardEvent[] {
		const events = list.map(record => record.event);
		return events;
	}

	function deserialize(events: BoardEvent[]): void {
		list = [];
		const eventArray = Array.isArray(events) ? events : [events];
		if (eventArray.length === 0) {
			return;
		}
		for (const event of events) {
			const eventBody = event.body;
			const command = createCommand(board, eventBody.operation);
			const record = { event, command };
			command.apply();
			push(record);
		}
	}

	function getSnapshot(): BoardSnapshot {
		const unordered = popUnorderedRecords();
		const events = serialize();
		const items = board.serialize();
		const lastIndex = events[events.length - 1].order;
		const snapshot = {
			events,
			items,
			lastIndex,
		};
		pushRecordsStackAndRecreateCommands(unordered);
		return snapshot;
	}

	function getLatestOrder(): number {
		for (let i = list.length - 1; i >= 0; i--) {
			const record = list[i];
			if (record.event.order) {
				return record.event.order;
			}
		}
		return 0;
	}

	function insertEvents(events: BoardEvent | BoardEvent[]): void {
		const eventArray = Array.isArray(events) ? events : [events];
		if (eventArray.length === 0) {
			return;
		}
		const latestEventOrder = getLatestOrder();
		const newEvents = eventArray.filter(event => {
			return event.order > latestEventOrder;
		});
		if (newEvents.length === 0) {
			return;
		}
		const unordered = popUnorderedRecords();
		const mergedEvents = mergeEvents(newEvents);
		for (const event of mergedEvents) {
			const eventBody = event.body;
			const command = createCommand(board, eventBody.operation);
			const record = { event, command };
			command.apply();
			push(record);
		}
		pushRecordsStackAndRecreateCommands(unordered);
	}

	function setEventOrder(event: BoardEvent): void {
		const record = getRecordById(event.body.eventId);
		if (record) {
			record.event.order = event.order;
		}
	}

	function push(record: HistoryRecord): HistoryRecord {
		const last = list.pop();
		if (!last) {
			list.push(record);
			return record;
		}
		const merge = mergeOperations(
			last.event.body.operation,
			record.event.body.operation,
		);
		if (!merge) {
			list.push(last);
			list.push(record);
			return record;
		}
		const mergedEvent = createMergedEvent(record.event, merge);
		const command = createCommand(board, mergedEvent.body.operation);
		if (record.event.body.operation.class === "Connector") {
			command.reverse = last.command.reverse;
		}
		const mergedRecord = {
			event: mergedEvent,
			command,
		};
		list.push(mergedRecord);
		return mergedRecord;
	}

	function mergeEvents(events: BoardEvent[]): BoardEvent[] {
		if (events.length < 2) {
			return events;
		}

		const mergedEvents: BoardEvent[] = [];
		let previous: BoardEvent | null = null;

		for (const event of events) {
			previous = handleEventMerge(event, previous, mergedEvents);
		}

		if (previous) {
			mergedEvents.push(previous);
		}

		return mergedEvents;
	}

	function handleEventMerge(
		event: BoardEvent,
		previous: BoardEvent | null,
		mergedEvents: BoardEvent[],
	): BoardEvent | null {
		if (!previous) {
			return event;
		}

		const mergedOperation = mergeOperations(
			previous.body.operation,
			event.body.operation,
		);
		if (!mergedOperation) {
			mergedEvents.push(previous);
			return event;
		}

		return createMergedEvent(event, mergedOperation);
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

	function popUnorderedRecords(): HistoryRecord[] {
		const records: HistoryRecord[] = [];
		for (let i = list.length - 1; i >= 0; i--) {
			const record = list[i];
			if (record.event.order) {
				break;
			} else {
				list.pop();
				record.command.revert();
				records.push(record);
			}
		}
		return records;
	}

	function getUnorderedRecords(): HistoryRecord[] {
		const records: HistoryRecord[] = [];
		for (let i = list.length - 1; i >= 0; i--) {
			const record = list[i];
			if (record.event.order) {
				break;
			} else {
				records.push(record);
			}
		}
		return records;
	}

	function pushRecordsStackAndRecreateCommands(
		records: HistoryRecord[],
	): void {
		for (let i = records.length - 1; i >= 0; i--) {
			const record = records[i];
			record.command = createCommand(board, record.event.body.operation);
			record.command.apply();
			list.push(record);
		}
	}

	function getUndoRecord(userId: number): HistoryRecord | null {
		let counter = 0;

		for (let i = list.length - 1; i >= 0; i--) {
			const record = list[i];

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

	function getRedoRecord(userId: number): HistoryRecord | null {
		let counter = 0;

		for (let i = list.length - 1; i >= 0; i--) {
			const record = list[i];

			if (record.event.body.userId !== userId) {
				continue;
			}

			const { method } = record.event.body.operation;

			if (method !== "undo" && method !== "redo") {
				return null;
			}

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
		for (const record of list) {
			if (record.event.body.eventId === id) {
				return record;
			}
		}
		return;
	}

	return {
		list,
		insertEvents,
		setEventOrder,
		push,
		getUnorderedRecords,
		getUndoRecord,
		getRedoRecord,
		getRecordById,
		serialize,
		deserialize,
		getSnapshot,
	};
}
