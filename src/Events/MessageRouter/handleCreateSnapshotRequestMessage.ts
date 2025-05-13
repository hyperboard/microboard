import { Board } from "Board";
import { SnapshotToPublish } from "../Events";
import { conf } from "Board/Settings";

export interface SnapshotRequestMsg {
	type: "CreateSnapshotRequest";
	boardId: string;
}

export type SnapshotToPublish = {
	boardId: string;
	snapshot: string;
	lastOrder: number;
};

export function handleCreateSnapshotRequestMessage(msg, board: Board): void {
	const { boardId, snapshot, lastOrder } = getSnapshotToPublish(board);

	conf.connection.send({
		type: "BoardSnapshot",
		boardId,
		snapshot,
		lastEventOrder: lastOrder,
		// lastEventOrder: snapshot.lastIndex,
	});
}

function getSnapshotToPublish(board: Board): SnapshotToPublish {
	const { log } = board.events;
	if (!log) {
		return;
	}
	const boardId = board.getBoardId();
	log.list.revertUnconfirmed();
	const snapshot = board.serializeHTML();
	const lastOrder = log.getLastIndex();
	log.list.applyUnconfirmed();
	return {
		boardId,
		snapshot,
		lastOrder,
	};
}
