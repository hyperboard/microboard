import { Board } from "Board";
import { conf } from "Settings";
import { SyncEvent } from "../Events";

export interface BoardEventMsg {
  type: "BoardEvent";
  boardId: string;
  event: SyncEvent;
  sequenceNumber: number;
  userId: string;
}

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

  log.insertEventsFromOtherConnections({
    ...event,
    userId: message.userId,
  });
  const last = log.getLastConfirmed();
  if (last) {
    board.events.subject.publish(last);
  }
}
