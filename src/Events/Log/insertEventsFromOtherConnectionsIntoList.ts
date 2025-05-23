import { Board } from "Board";
import { createCommand } from "../Command";
import { SyncEvent, BoardEvent, SyncBoardEvent } from "../Events";
import { mergeEvents } from "../mergeEvents";
import { transformEvents } from "../transformEvents";
import { EventsList } from "./createEventsList";
import { expandEvents } from "./expandEvents";
// import { handleRemoveSnappedObject } from "../handleRemoveSnappedObject";

/**
 * Inserts events from other connections into the events list. This function is
 * a core part of the Operational Transformation (OT) conflict resolution system
 * and it handles synchronization of events across multiple connections.
 *
 * @param value - A single SyncEvent or an array of SyncEvents to be inserted
 * @param list - The EventsList to insert the events into
 * @param board - The Board instance that the events will be applied to
 */
export function insertEventsFromOtherConnectionsIntoList(
	value: SyncEvent | SyncEvent[],
	list: EventsList,
	board: Board,
): void {
	// Normalize the input to an array of events
	const eventArray = Array.isArray(value) ? value : [value];
	if (eventArray.length === 0) {
		return;
	}
	// Expand the events to their full form
	const events = expandEvents(eventArray);

	// Previous implementation for handling snapped objects was removed
	// handleRemoveSnappedObject(board, events, list); // should do it in other ways

	const savedSelection = board.selection.memoize();
	// Revert any unconfirmed changes to ensure a clean state
	list.revertUnconfirmed();

	// Transform events that might conflict with existing events
	const transformed: BoardEvent[] = transformConflictingEvents(events, list);

	// Merge similar events to reduce redundancy
	const mergedEvents = mergeEvents(transformed);
	for (const event of mergedEvents) {
		// Create and apply commands for each event
		const command = createCommand(board, event.body.operation);
		const record = { event, command };
		command.apply();
		list.addConfirmedRecords([record]);
		list.justConfirmed.push(record);
	}
	// Re-apply any unconfirmed changes that were reverted earlier
	list.applyUnconfirmed();

	try {
		const currSelection = board.selection
			.list()
			.map(item => item.getId())
			.sort();
		const savedItems: string[] = JSON.parse(savedSelection.selectedItems);
		// selection might change if reverting and applying remove and add selected item
		const selectionChanged =
			savedItems && savedItems.length !== currSelection.length;
		if (selectionChanged) {
			board.selection.applyMemoized();
		}
	} catch {}
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
