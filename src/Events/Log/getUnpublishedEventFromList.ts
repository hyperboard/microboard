import { BoardEventPack, BoardEvent } from "../Events";
import { Operation } from "../EventsOperations";
import { EventsList } from "./createEventsList";
import { HistoryRecord } from "./EventsLog";
import { mergeRecords } from "../mergeRecords";

export function getUnpublishedEventFromList(
	list: EventsList,
): { event: BoardEventPack; sentEventIds: string[] } | null {
	const recordsToSend = list.prepareRecordsToSend();

	if (recordsToSend.length === 0) {
		return null;
	}

	const mergedRecords = mergeRecords(recordsToSend);
	const operations = getOperationsFromEventRecords(mergedRecords);
	return {
		event: combineOperationsIntoPack(recordsToSend[0].event, operations),
		sentEventIds: recordsToSend.map(record => record.event.body.eventId),
	};
}

function getOperationsFromEventRecords(
	records: HistoryRecord[],
): (Operation & { actualId: string })[] {
	return records.map(record => ({
		...record.event.body.operation,
		actualId: record.event.body.eventId,
	}));
}

function combineOperationsIntoPack(
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
