import { Board } from "Board";
import { createCommand } from "../Command";
import { SyncBoardEvent } from "../Events";
import { EventsList } from "./createEventsList";

export function deserializeAndApplyToList(
	events: SyncBoardEvent[],
	list: EventsList,
	board: Board,
): void {
	list.clear();

	for (const event of events) {
		const body = event.body as any;
		if (body.operations && Array.isArray(body.operations)) {
			// Handle batch events: if there is an array of operations, iterate over each one.
			for (const op of body.operations) {
				// Create a new event object for this particular operation.
				const singleEvent: SyncBoardEvent = {
					...event,
					body: {
						...event.body,
						operation: op,
					},
				};
				const command = createCommand(board, op);
				const record = { event: singleEvent, command };
				command.apply();
				list.addConfirmedRecords([record]);
			}
		} else {
			// Handle single operation event.
			const command = createCommand(board, event.body.operation);
			const record = { event, command };
			command.apply();
			list.addConfirmedRecords([record]);
		}
	}
}
