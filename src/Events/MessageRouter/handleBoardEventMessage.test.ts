import { initNodeSettings } from "api/initNodeSettings";
initNodeSettings();

import { Board } from "Board";
import { Connection } from "Settings";
import { createEvents } from "../Events";
import { handleBoardEventMessage } from "./handleBoardEventMessage";
import { BoardEventMsg } from "./boardMessageInterface";
import { RichText } from "Items/RichText/RichText";
import { Mbr } from "Geometry/Mbr";
import { ItemData } from "Items";

function createConnection(connectionId: number, sessionId = `session-${connectionId}`): Connection {
  return {
    connectionId,
    sessionId,
    authorUserId: "user-1",
    getCurrentUser: () => "user-1",
    getSessionId: () => sessionId,
    getAuthorUserId: () => "user-1",
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

function createAddOperation(board: Board, itemId: string) {
  const defaultData: ItemData = {
    backgroundColor: "none",
    backgroundOpacity: 1,
    borderColor: "rgb(20, 21, 26)",
    borderOpacity: 1,
    borderStyle: "solid",
    borderWidth: 1,
    itemType: "Shape",
    shapeType: "Rectangle",
    transformation: {
      isLocked: false,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: 0,
    },
    text: { ...new RichText(board).serialize() },
  };

  return {
    class: "Board" as const,
    method: "add" as const,
    item: itemId,
    data: defaultData,
  };
}

function createBoardEventMessage(
  board: Board,
  {
    eventId,
    sessionId,
    authorUserId = "user-2",
    legacyUserId,
  }: {
    eventId: string;
    sessionId?: string;
    authorUserId?: string;
    legacyUserId?: number | string;
  }
): BoardEventMsg {
  return {
    type: "BoardEvent",
    boardId: board.getBoardId(),
    sequenceNumber: 1,
    event: {
      order: 1,
      lastKnownOrder: 0,
      body: {
        eventId,
        sessionId,
        authorUserId,
        userId: legacyUserId,
        boardId: board.getBoardId(),
        operation: createAddOperation(board, `item-${eventId}`),
      },
    },
  };
}

describe("handleBoardEventMessage", () => {
  test("ignores echoed events from the current session", () => {
    const board = new Board("test-board");
    board.events = createEvents(board, createConnection(77, "session-77"), 0);

    const echoedMessage = createBoardEventMessage(board, {
      eventId: "77:1",
      sessionId: "session-77",
      authorUserId: "user-1",
      legacyUserId: 77,
    });
    handleBoardEventMessage(echoedMessage, board);

    expect(board.events.log.getLastConfirmed()).toBeNull();
    expect(board.items.getById("item-77:1")).toBeUndefined();
  });

  test("treats same author in a different session as remote", () => {
    const board = new Board("test-board");
    board.events = createEvents(board, createConnection(77, "session-77"), 0);

    const remoteMessage = createBoardEventMessage(board, {
      eventId: "88:1",
      sessionId: "session-88",
      authorUserId: "user-1",
      legacyUserId: 88,
    });
    handleBoardEventMessage(remoteMessage, board);

    const confirmed = board.events.log.getLastConfirmed();
    expect(confirmed).not.toBeNull();
    expect(confirmed?.body.authorUserId).toBe("user-1");
    expect(confirmed?.body.sessionId).toBe("session-88");
    expect(board.items.getById("item-88:1")).toBeDefined();
  });

  test("supports legacy events that only carry body.userId as the session-like origin", () => {
    const board = new Board("test-board");
    board.events = createEvents(board, createConnection(77, "session-77"), 0);

    const remoteMessage = createBoardEventMessage(board, {
      eventId: "legacy-88:1",
      legacyUserId: 88,
    });
    handleBoardEventMessage(remoteMessage, board);

    const confirmed = board.events.log.getLastConfirmed();
    expect(confirmed).not.toBeNull();
    expect(confirmed?.body.userId).toBe(88);
    expect(confirmed?.body.sessionId).toBeUndefined();
    expect(board.items.getById("item-legacy-88:1")).toBeDefined();
  });
});
