import { Board } from "Board";
import { SyncBoardEvent, SyncEvent } from "../Events";
import { EventsList } from "./createEventsList";

export function deserializeAndApplyToList(
	events: SyncEvent[],
	list: EventsList,
	board: Board,
): void {
	list.clear();

	for (const event of events) {
		if ("operations" in event.body) {
			// Handle batch events: if there is an array of operations, iterate over each one.
			const { operations, lastKnownOrder, ...bodyWithoutOps } = event.body;
			for (const op of operations) {
				// Create a new event object for this particular operation.
				const singleEvent: SyncBoardEvent = {
					order: event.order,
					lastKnownOrder: lastKnownOrder,
					userId: bodyWithoutOps.userId,
					body: {
						...bodyWithoutOps,
						operation: op,
					},
				};
				const command = list.commandFactory(op);
				const record = { event: singleEvent, command };
				command.apply();
				list.addConfirmedRecords([record]);
			}
		} else {
			// Handle single operation event.
			const command = list.commandFactory(event.body.operation);
			const record = { event: event as SyncBoardEvent, command };
			command.apply();
			list.addConfirmedRecords([record]);
		}
	}
}
