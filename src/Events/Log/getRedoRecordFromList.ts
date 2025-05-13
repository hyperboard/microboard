import { EventsList } from "./createEventsList";
import { HistoryRecord } from "./EventsLog";
import { shouldSkipEvent } from "./shouldSkipEvent";

export function getRedoRecordFromList(
	userId: number,
	list: EventsList,
): HistoryRecord | null {
	let counter = 0;

	for (const record of list.backwardIterable()) {
		if (shouldSkipEvent(record, userId)) {
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
