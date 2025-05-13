import { BoardSnapshot } from "Board/Board";
import { getLastIndexFromList } from "./getLastIndexFromList";

export function getSnapshotFromList(list, board): BoardSnapshot {
	list.revertUnconfirmed();
	const snapshot = {
		events: list.getConfirmedRecords().map(record => record.event),
		items: board.serialize(),
		lastIndex: getLastIndexFromList(list),
	};
	list.applyUnconfirmed();
	return snapshot;
}
