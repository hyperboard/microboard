import { Board } from "Board";
import { createCommand } from "../Command";
import { SyncEvent, BoardEvent } from "../Events";
import { mergeEvents } from "../mergeEvents";
import { transformEvents } from "../transformEvents";
import { EventsList } from "./createEventsList";
import { expandEvents } from "./expandEvents";
import { handleRemoveSnappedObject } from "../handleRemoveSnappedObject";

export function insertEventsFromOtherConnectionsIntoList(
	value: SyncEvent | SyncEvent[],
	list: EventsList,
	board: Board,
): void {
	const eventArray = Array.isArray(value) ? value : [value];
	if (eventArray.length === 0) {
		return;
	}
	const events = expandEvents(eventArray);

	handleRemoveSnappedObject(board, events, list);

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
					evnt.order <= event.order &&
					(event.userId !== evnt.userId ||
						evnt?.userdId === undefined),
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
