import { EventsList } from "./createEventsList";

export function getLastIndexFromList(list: EventsList): number {
	const confirmedRecords = list.getConfirmedRecords();
	const lastConfirmedRecord = confirmedRecords[confirmedRecords.length - 1];

	if (!lastConfirmedRecord) {
		return list.getSnapshotLastIndex();
	}

	const lastConfirmedEventOrder = lastConfirmedRecord.event.order;
	if (list.getSnapshotLastIndex() >= lastConfirmedEventOrder) {
		return list.getSnapshotLastIndex();
	}

	return lastConfirmedEventOrder;
}
