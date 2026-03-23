import { Board } from "Board";
import { SyncBoardEvent, SyncBoardEventPack, SyncEvent } from "../Events";
import { BoardEventMsg } from './boardMessageInterface';
import { getBoardEventSessionId, getConnectionSessionId } from "../identity";

export function handleBoardEventMessage(
  message: BoardEventMsg,
  board: Board
): void {
  if (!board.events) {
    return;
  }
  const { log } = board.events;
  const event = message.event;

  if (event.order <= log.getLastIndex()) {
    return;
  }

  const eventSessionId = getBoardEventSessionId(event.body);
  const currentConnectionId = getConnectionSessionId(board.events.connection);
  const isEventFromCurrentUser =
    eventSessionId !== undefined && eventSessionId === currentConnectionId;

  if (isEventFromCurrentUser) {
    return;
  }

  if ("operations" in event.body) {
    log.insertEventsFromOtherConnections(event as SyncBoardEventPack);
  } else {
    log.insertEventsFromOtherConnections(event as SyncBoardEvent);
  }

  const last = log.getLastConfirmed();
  if (last) {
    board.events.subject.publish(last);
  }
}
