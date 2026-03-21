import { SyncEvent, SyncBoardEvent } from "../Events";

export function expandEvents(events: SyncEvent[]): SyncBoardEvent[] {
	return events.flatMap((event): SyncBoardEvent[] => {
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
				userId: event.body.userId,
				lastKnownOrder:
					"lastKnownOrder" in event
						? (event as any).lastKnownOrder
						: (event.body as any).lastKnownOrder,
			}));
		} else {
			// Это обычный BoardEvent
			return [event as SyncBoardEvent];
		}
	});
}
