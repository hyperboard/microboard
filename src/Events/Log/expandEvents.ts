import { SyncEvent, SyncBoardEvent } from "../Events";

export function expandEvents(events: SyncEvent[]): SyncBoardEvent[] {
	return events.flatMap(event => {
		if ("operations" in event.body) {
			// Это BoardEventPack
			return event.body.operations.map(operation => ({
				order: event.order,
				body: {
					eventId: operation.actualId || event.body.eventId,
					userId: event.body.userId,
					boardId: event.body.boardId,
					operation,
				},
				lastKnownOrder:
					"lastKnownOrder" in event
						? event.lastKnownOrder
						: event.body.lastKnownOrder,
			}));
		} else {
			// Это обычный BoardEvent
			return [event as SyncBoardEvent];
		}
	});
}
