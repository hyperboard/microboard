import { Board } from "Board";
import { SyncBoardEvent, SyncBoardEventPack, SyncEvent } from "../Events";
import { BoardEventMsg } from './boardMessageInterface';

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

  const eventUserId = parseFloat(event.body.eventId.split(":")[0]);
  const currentUserId = Number(localStorage.getItem("userId") || "0");
  const isEventFromCurrentUser = eventUserId === currentUserId;

  if (isEventFromCurrentUser) {
    return;
  }

  if ("operations" in event.body) {
    log.insertEventsFromOtherConnections({
      ...event,
      body: {
        ...event.body,
        userId: Number(message.userId),
      },
    } as SyncBoardEventPack);
  } else {
    log.insertEventsFromOtherConnections({
      ...event,
      userId: Number(message.userId),
    } as SyncBoardEvent);
  }

  const last = log.getLastConfirmed();
  if (last) {
    board.events.subject.publish(last);
  }
}
