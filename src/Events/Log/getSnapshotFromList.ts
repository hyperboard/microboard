import { BoardSnapshot } from 'Board';
import { getLastIndexFromList } from './getLastIndexFromList';

export function getSnapshotFromList(list: any, board: any) {
  list.revertUnconfirmed();
  const snapshot = {
    events: list.getConfirmedRecords().map((record: any) => record.event),
    items: board.serialize(),
    lastIndex: getLastIndexFromList(list),
  };
  list.applyUnconfirmed();
  return snapshot;
}
