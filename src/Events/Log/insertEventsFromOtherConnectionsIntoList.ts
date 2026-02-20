import { Board } from "Board";
import { createCommand } from "../Command";
import { SyncEvent, BoardEvent, SyncBoardEvent } from "../Events";
import { mergeEvents } from "../mergeEvents";
import { transformEvents } from "../transformEvents";
import { EventsList, FilterPredicate } from "./createEventsList";
import { expandEvents } from "./expandEvents";
// import { handleRemoveSnappedObject } from "../handleRemoveSnappedObject";

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

	// handleRemoveSnappedObject(board, events, list);

	board.selection.memoize();
	const createdItems: string[] = [];
	const updatedText: string[] = [];
	const filter: FilterPredicate = rec => {
		const op = rec.event.body.operation;
		if (op.method === "add") {
			const creating = Array.isArray(op.item) ? op.item : [op.item];
			createdItems.push(...creating);
			return false;
		}
		return true;
	};

	list.revertUnconfirmed(filter);

	const transformed: BoardEvent[] = transformConflictingEvents(events, list);

	const mergedEvents = mergeEvents(transformed);

	for (const event of mergedEvents) {
		const command = createCommand(board, event.body.operation);
		const record = { event, command };
		command.apply();
		list.addConfirmedRecords([record]);
		list.justConfirmed.push(record);
	}

	list.applyUnconfirmed(filter);

	const hasAnyOverlap = <T>(arr1: T[], arr2: T[]): boolean => {
		const lookup = new Set(arr1);
		return arr2.some(item => lookup.has(item));
	};
	const currSelection = board.selection.list().map(item => item.getId());
	if (
		hasAnyOverlap(currSelection, createdItems) ||
		hasAnyOverlap(currSelection, updatedText)
	) {
		board.selection.applyMemoizedCaretOrRange();
	}
}

/**
 * Transforms events that conflict with the current state of the board.
 * Conflicts occur when events have gaps in their order sequence.
 *
 * @param events - The events to transform
 * @param list - The EventsList containing the current confirmed records
 * @returns An array of transformed BoardEvents that can be safely applied
 */
function transformConflictingEvents(
	events: SyncBoardEvent[],
	list: EventsList,
): BoardEvent[] {
	const transformed: BoardEvent[] = [];

	for (const event of events) {
		// Check if there's a conflict based on event ordering
		const isConflictDetected =
			event.lastKnownOrder !== undefined &&
			event.lastKnownOrder + 1 < event.order;

		if (!isConflictDetected) {
			// If no conflict, add the event directly
			transformed.push(event);
		} else {
			// If conflict detected, collect all events that occurred between
			// lastKnownOrder and order from both the confirmed list and the new events
			const confirmed = [
				...list.getConfirmedRecords().map(rec => rec.event),
				...events,
			].filter(
				one =>
					one.body.eventId !== event.body.eventId &&
					one.order > event.lastKnownOrder &&
					one.order <= event.order,
			);
			// Transform the conflicting event against all confirmed events
			transformed.push(...transformEvents(confirmed, [event]));
		}
	}
	return transformed;
}
