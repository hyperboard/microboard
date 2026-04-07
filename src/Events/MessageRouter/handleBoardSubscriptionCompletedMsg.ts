import {Board, BoardSnapshot} from "Board";
import { conf } from "Settings";
import { BoardEventPack, SyncBoardEvent, SyncEvent } from "../Events";
import { getConnectionAuthorUserId, getConnectionSessionId } from "../identity";
import {
	BoardSubscriptionCompletedMsg,
	WireBoardSubscriptionCompletedMsg,
} from "./boardMessageInterface";
import { expandEvents } from "../Log/expandEvents";
import { normalizeBoardSubscriptionCompletedMsg } from "./socketContract";

export function handleBoardSubscriptionCompletedMsg(
  msg: WireBoardSubscriptionCompletedMsg | BoardSubscriptionCompletedMsg,
  board: Board
): void {
  const normalized = normalizeForBoard(msg);
  const { log } = board.events;
  handleSeqNumApplication(normalized.initialSequenceNumber, board);
  if (normalized.snapshot) {
    handleSnapshotApplication(normalized.snapshot, board);
    log.list.clearConfirmedRecords();
  } else if (normalized.JSONSnapshot) {
    handleHTMLSnapshotApplication(normalized.JSONSnapshot, board);
    log.list.clearConfirmedRecords();
  }
  handleBoardEventListApplication(
    expandEvents(normalized.eventsSinceLastSnapshot),
    board
  );

  board.setInterfaceType(normalized.mode);

  board.subject.publish();
  onBoardLoad(board);
}

function normalizeForBoard(
  msg: WireBoardSubscriptionCompletedMsg | BoardSubscriptionCompletedMsg
): BoardSubscriptionCompletedMsg {
  const normalized = normalizeBoardSubscriptionCompletedMsg(msg);

  return {
    ...normalized,
    JSONSnapshot: normalized.JSONSnapshot as BoardSnapshot | null | undefined,
    eventsSinceLastSnapshot: normalized.eventsSinceLastSnapshot as SyncEvent[],
  };
}

function handleSeqNumApplication(
  initialSequenceNumber: number,
  board: Board
): void {
  const { log } = board.events;
  const sessionId = getConnectionSessionId(board.events.connection);
  const authorUserId = getConnectionAuthorUserId(board.events.connection);

  log.refreshUnconfirmedIdentity(sessionId, authorUserId);
  log.currentSequenceNumber = initialSequenceNumber;
  startIntervals(board);
}

function startIntervals(board: Board): void {
  const { log } = board.events;

  if (log.publishIntervalTimer) {
    clearInterval(log.publishIntervalTimer);
  }
  if (log.resendIntervalTimer) {
    clearInterval(log.resendIntervalTimer);
  }

  log.publishIntervalTimer = setInterval(() => {
    tryPublishEvent(board);
  }, conf.EVENTS_PUBLISH_INTERVAL);
  log.resendIntervalTimer = setInterval(() => {
    tryResendEvent(board);
  }, conf.EVENTS_RESEND_INTERVAL);
}

function tryPublishEvent(board: Board): void {
  const { log } = board.events;

  if (log.pendingEvent) {
    return;
  }
  const unpublishedBatch = log.getUnpublishedEvent();
  if (!unpublishedBatch) {
    return;
  }
  sendBoardEvent(board, unpublishedBatch, log.currentSequenceNumber);
}

function tryResendEvent(board: Board): void {
  const { log } = board.events;

  if (!log.pendingEvent) {
    return;
  }
  const date = Date.now();
  const isTimeToSendPendingEvent =
    date - log.pendingEvent.lastSentTime >= conf.EVENTS_RESEND_INTERVAL;
  if (!isTimeToSendPendingEvent) {
    return;
  }
  const isProbablyLostConnection =
    log.firstSentTime &&
    date - log.firstSentTime >= conf.EVENTS_RESEND_INTERVAL * 5;
  if (isProbablyLostConnection) {
    board.presence.clear();
    conf.connection?.notifyAboutLostConnection();
  }

  sendBoardEvent(
    board,
    {
      event: log.pendingEvent.event,
      sentEventIds: log.pendingEvent.sentEventIds,
    },
    log.currentSequenceNumber
  );
}

function stopIntervals(board: Board): void {
  const { log } = board.events;

  if (log.publishIntervalTimer) {
    clearInterval(log.publishIntervalTimer);
    log.publishIntervalTimer = null;
  }
  if (log.resendIntervalTimer) {
    clearInterval(log.resendIntervalTimer);
    log.resendIntervalTimer = null;
  }
}

function handleSnapshotApplication(snapshot: string, board: Board): void {
  const { log } = board.events;
  board.deserializeHTML(snapshot);
  const match = snapshot.match(/last-event-order" content="(\d+)"/);
  if (match && match[1]) {
    log.list.setSnapshotLastIndex(Number(match[1]));
  }
}

function handleHTMLSnapshotApplication(snapshot: BoardSnapshot, board: Board): void {
  const { log } = board.events;
  board.deserialize(snapshot);
  log.list.setSnapshotLastIndex(Number(snapshot.lastIndex));
}

function handleBoardEventListApplication(
  events: SyncBoardEvent[],
  board: Board
): void {
  const { log } = board.events;

  const existinglist = log.list.getAllRecords();

  const maxOrder = Math.max(
    ...existinglist.map((record) => record.event.order)
  );

  const newEvents = events.filter((event) => event.order > maxOrder);

  if (newEvents.length > 0) {
    log.insertEventsFromOtherConnections(newEvents);
    board.events.subject.publish(newEvents[0]);
  }
}

function sendBoardEvent(
  board: Board,
  batch: { event: BoardEventPack; sentEventIds: string[] },
  sequenceNumber: number
): void {
  const { log } = board.events;
  const { event, sentEventIds } = batch;

  const toSend: SyncEvent = {
    ...event,
    body: {
      ...event.body,
      lastKnownOrder: log.getLastIndex(),
    },
  };
  conf.connection.send({
    type: "BoardEvent",
    boardId: board.getBoardId(),
    event: toSend,
    sequenceNumber,
  });

  const date = Date.now();
  log.pendingEvent = {
    event: toSend,
    sentEventIds,
    sequenceNumber,
    lastSentTime: date,
  };
  if (!log.firstSentTime) {
    log.firstSentTime = date;
  }
}

function onBoardLoad(board: Board): void {
  if (typeof window === "undefined") {
    return;
  }

  const searchParams = new URLSearchParams(window.location.search.slice(1));
  const toFocusId = searchParams.get("focus") ?? "";
  const toFocusItem = board.items.getById(toFocusId);
  if (toFocusItem) {
    const mbr = toFocusItem.getMbr();
    mbr.left -= 50;
    mbr.top -= 50;
    mbr.right += 50;
    mbr.bottom += 50;
    board.camera.zoomToFit(mbr);
  }

  const cameraSnapshot = board.getCameraSnapshot();
  const hasItemsInBoard = board.items.listAll().length !== 0;
  const isItemsOutOfView =
    board.items.getItemsInView().length === 0 || !cameraSnapshot;

  if (isItemsOutOfView && hasItemsInBoard) {
    board.camera.zoomToFit(board.items.getFilteredMbr());
  }

  if (!hasItemsInBoard) {
    board.camera.zoomToViewCenter(1);
  }

  board.camera.setBoardId(board.getBoardId());
}
