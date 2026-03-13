import type { BaseSelection } from "slate";
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

	// Capture the local RichText edit op selection for the focused text item
	// so we can OT-adjust the memoized user cursor after re-applying unconfirmed ops.
	const focusedTextId = board.selection.memorySnapshot?.focus?.textToEdit;
	let localOpOriginalSelection: BaseSelection = null;
	if (focusedTextId) {
		const allUnconfirmed = [...list.getRecordsToSend(), ...list.getNewRecords()];
		for (const rec of allUnconfirmed) {
			const op = rec.event.body.operation;
			if (op.class === "RichText" && op.method === "edit") {
				const items = Array.isArray(op.item) ? op.item : [op.item];
				if (items.includes(focusedTextId)) {
					localOpOriginalSelection = (op as { selection: BaseSelection }).selection;
					break;
				}
			}
		}
	}

	const createdItems: string[] = [];
	const updatedText: string[] = [];
	const filter: FilterPredicate = rec => {
		const op = rec.event.body.operation;
		if (op.method === "add") {
			const creating = Array.isArray(op.item) ? op.item : [op.item];
			createdItems.push(...creating);
			return false;
		}
		if (op.class === "RichText" && op.method === "edit") {
			const items = Array.isArray(op.item) ? op.item : [op.item];
			updatedText.push(...items);
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

	// If the focused text item had a local edit op, apply OT-adjusted memoized cursor.
	// We compute the OT delta as: (cursor after re-apply) - (original local op selection),
	// then apply that delta to the memoized user cursor.
	const memoizedCursor = board.selection.memorySnapshot?.focus?.selection;
	if (
		focusedTextId &&
		localOpOriginalSelection &&
		memoizedCursor &&
		hasAnyOverlap(currSelection, updatedText)
	) {
		const rt = board.items.getById(focusedTextId)?.getRichText();
		if (rt) {
			const otAdjustedCursor = rt.editor.getSelection();
			if (
				otAdjustedCursor &&
				memoizedCursor.anchor.path.length > 0 &&
				memoizedCursor.focus.path.length > 0
			) {
				const deltaAnchor =
					otAdjustedCursor.anchor.offset - (localOpOriginalSelection?.anchor?.offset ?? 0);
				const deltaFocus =
					otAdjustedCursor.focus.offset - (localOpOriginalSelection?.focus?.offset ?? 0);
				const adjustedSelection = {
					anchor: {
						path: memoizedCursor.anchor.path,
						offset: memoizedCursor.anchor.offset + deltaAnchor,
					},
					focus: {
						path: memoizedCursor.focus.path,
						offset: memoizedCursor.focus.offset + deltaFocus,
					},
				};
				rt.editorTransforms.select(rt.editor.editor, adjustedSelection);
			}
		}
	} else if (
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
