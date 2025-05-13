import { BoardEventPack, BoardEvent } from "../Events";
import { Operation } from "../EventsOperations";
import { EventsList } from "./createEventsList";
import { HistoryRecord } from "./EventsLog";

export function getUnpublishedEventFromList(
	list: EventsList,
): BoardEventPack | null {
	const recordsToSend = list.prepareRecordsToSend();

	if (recordsToSend.length === 0) {
		return null;
	}

	const operations = getOperationsFromEventRecords(recordsToSend);
	return combineOperationsIntoPack(recordsToSend[0].event, operations);
}

function getOperationsFromEventRecords(
	records: HistoryRecord[],
): (Operation & { actualId: string })[] {
	return records.map(record => ({
		...record.event.body.operation,
		actualId: record.event.body.eventId,
	}));
}

export function combineOperationsIntoPack(
	baseEvent: BoardEvent,
	operations: (Operation & { actualId: string })[],
): BoardEventPack {
	// Create a new body object without the operation property
	const { operation, ...bodyWithoutOperation } = baseEvent.body;

	return {
		...baseEvent,
		body: {
			...bodyWithoutOperation,
			operations,
		},
	};
}
