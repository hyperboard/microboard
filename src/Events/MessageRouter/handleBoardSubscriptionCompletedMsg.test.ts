import { initNodeSettings } from "api/initNodeSettings";
initNodeSettings();

import { Board } from "Board";
import { createEvents } from "../Events";
import { Connection, conf } from "Settings";
import { handleBoardSubscriptionCompletedMsg } from "./handleBoardSubscriptionCompletedMsg";

function createConnection(
  connectionId: number,
  sessionId = `session-${connectionId}`,
  authorUserId = `user-${connectionId}`
): Connection {
  return {
    connectionId,
    sessionId,
    authorUserId,
    getCurrentUser: () => authorUserId,
    getSessionId: () => sessionId,
    getAuthorUserId: () => authorUserId,
    connect: async () => {},
    subscribe: () => {},
    unsubscribe: () => {},
    publishPresenceEvent: () => {},
    publishAuth: async () => {},
    publishLogout: () => {},
    onAccessDenied: () => {},
    notifyAboutLostConnection: () => {},
    dismissNotificationAboutLostConnection: () => {},
    resetConnection: () => {},
    send: () => {},
  };
}

describe("handleBoardSubscriptionCompletedMsg", () => {
  test("restamps unconfirmed local events to the current connection identity after resubscribe", () => {
    const testGlobal = globalThis as typeof globalThis & {
      window?: {
        location: { search: string };
        addEventListener: () => void;
        removeEventListener: () => void;
      };
    };
    const previousWindow = testGlobal.window;

    try {
      const staleConnection = createConnection(1, "session-stale", "user-stale");
      conf.connection = staleConnection;

      const board = new Board("test-board");
      board.events = createEvents(board, staleConnection, 0);

      board.events.emit({
        class: "Events",
        method: "redo",
        eventId: "seed-event",
      });

      const unpublishedBatch = board.events.log.getUnpublishedEvent();
      expect(unpublishedBatch).not.toBeNull();

      board.events.log.pendingEvent = {
        ...unpublishedBatch!,
        sequenceNumber: 1,
        lastSentTime: Date.now(),
      };

      const nextConnection = createConnection(2, "session-fresh", "user-fresh");
      conf.connection = nextConnection;
      board.events.connection = nextConnection;
      testGlobal.window = {
        location: { search: "" },
        addEventListener: () => {},
        removeEventListener: () => {},
      };

      handleBoardSubscriptionCompletedMsg(
        {
          type: "BoardSubscriptionCompleted",
          boardId: board.getBoardId(),
          initialSequenceNumber: 2,
          eventsSinceLastSnapshot: [],
          mode: "edit",
        },
        board
      );

      expect(board.events.log.pendingEvent).toBeNull();
      expect(board.events.log.currentSequenceNumber).toBe(2);

      const resentBatch = board.events.log.getUnpublishedEvent();
      expect(resentBatch).not.toBeNull();
      expect(resentBatch?.event.body.sessionId).toBe("session-fresh");
      expect(resentBatch?.event.body.userId).toBe("session-fresh");
      expect(resentBatch?.event.body.authorUserId).toBe("user-fresh");
    } finally {
      if (previousWindow === undefined) {
        delete testGlobal.window;
      } else {
        testGlobal.window = previousWindow;
      }
    }
  });
});
