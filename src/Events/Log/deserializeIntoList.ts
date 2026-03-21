import { Board } from "Board";
import { SyncBoardEvent } from "../Events";
import { EventsList } from "./createEventsList";

export function deserializeIntoList(
	events: SyncBoardEvent[],
	list: EventsList,
	board: Board,
): void {
	list.clear();

	for (const event of events) {
		const command = list.commandFactory(event.body.operation);
		const record = { event, command };
		list.addConfirmedRecords([record]);
	}
}
