import { EventsList } from "./createEventsList";
import { HistoryRecord } from "./EventsLog";

export function getRecordByIdFromList(
	id: string,
	list: EventsList,
): HistoryRecord | undefined {
	for (const record of list.forwardIterable()) {
		if (record.event.body.eventId === id) {
			return record;
		}
	}
	return;
}
