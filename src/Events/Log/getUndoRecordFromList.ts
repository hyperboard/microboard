import { EventsList } from "./createEventsList";
import { HistoryRecord } from "./EventsLog";
import { shouldSkipEvent } from "./shouldSkipEvent";

export function getUndoRecordFromList(
	userId: number,
	list: EventsList,
): HistoryRecord | null {
	let counter = 0;

	const isAllEventsConfirmed = list.isAllEventsConfirmed();

	if (!isAllEventsConfirmed) {
		return null;
	}

	for (const record of list.getConfirmedRecords().slice().reverse()) {
		if (shouldSkipEvent(record, userId)) {
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
