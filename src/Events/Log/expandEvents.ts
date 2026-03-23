import { SyncEvent, SyncBoardEvent } from "../Events";

export function expandEvents(events: SyncEvent[]): SyncBoardEvent[] {
	return events.flatMap((event): SyncBoardEvent[] => {
		if ("operations" in event.body) {
			// It's a BoardEventPack
			const { operations, lastKnownOrder, ...bodyWithoutOps } = event.body;
				return operations.map(operation => ({
					order: event.order,
					body: {
						eventId: operation.actualId || bodyWithoutOps.eventId,
						authorUserId: bodyWithoutOps.authorUserId,
						sessionId: bodyWithoutOps.sessionId,
						userId: bodyWithoutOps.userId,
						boardId: bodyWithoutOps.boardId,
						operation,
					},
					lastKnownOrder: lastKnownOrder,
				}));
		} else {
			// It's a regular BoardEvent
			return [event as SyncBoardEvent];
		}
	});
}
