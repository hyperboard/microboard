import { Board } from 'Board';
import { conf } from 'Settings';
import { SnapshotRequestMsg, BoardSnapshotMsg } from './boardMessageInterface';

export type SnapshotToPublish = {
	boardId: string;
	snapshot: string;
	lastOrder: number;
};

export function handleCreateSnapshotRequestMessage(msg: SnapshotRequestMsg, board: Board): void {
	const result = getSnapshotToPublish(board);
	if (!result) {
		return;
	}
	const { boardId, snapshot, lastOrder } = result;

	conf.connection.send({
		type: 'BoardSnapshot',
		boardId,
		snapshot,
		lastEventOrder: lastOrder,
	} as BoardSnapshotMsg);
}

function getSnapshotToPublish(board: Board): SnapshotToPublish | null {
	const { log } = board.events;
	if (!log) {
		return null;
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
