import { initNodeSettings } from "api/initNodeSettings";
initNodeSettings();

import { Board } from "Board";
import { Connection } from "Settings";
import { createEvents } from "../Events";
import { handleBoardEventMessage } from "./handleBoardEventMessage";
import { BoardEventMsg } from "./boardMessageInterface";
import { RichText } from "Items/RichText/RichText";
import { Mbr } from "Items/Mbr";
import { ItemData } from "Items";

function createConnection(connectionId: number): Connection {
  return {
    connectionId,
    getCurrentUser: () => "user-1",
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
    text: { ...new RichText(board, new Mbr()).serialize() },
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
  eventId: string,
  userId: number
): BoardEventMsg {
  return {
    type: "BoardEvent",
    boardId: board.getBoardId(),
    sequenceNumber: 1,
    userId: "different-app-user-id",
    event: {
      order: 1,
      lastKnownOrder: 0,
      userId,
      body: {
        eventId,
        userId,
        boardId: board.getBoardId(),
        operation: createAddOperation(board, `item-${eventId}`),
      },
    },
  };
}

describe("handleBoardEventMessage", () => {
  test("ignores echoed events from the current connection even if envelope userId differs", () => {
    const board = new Board("test-board");
    board.events = createEvents(board, createConnection(77), 0);

    const echoedMessage = createBoardEventMessage(board, "77:1", 77);
    handleBoardEventMessage(echoedMessage, board);

    expect(board.events.log.getLastConfirmed()).toBeNull();
    expect(board.items.getById("item-77:1")).toBeUndefined();
  });

  test("keeps the event author identity from the payload when applying remote events", () => {
    const board = new Board("test-board");
    board.events = createEvents(board, createConnection(77), 0);

    const remoteMessage = createBoardEventMessage(board, "88:1", 88);
    handleBoardEventMessage(remoteMessage, board);

    const confirmed = board.events.log.getLastConfirmed();
    expect(confirmed).not.toBeNull();
    expect(confirmed?.body.userId).toBe(88);
    expect(board.items.getById("item-88:1")).toBeDefined();
  });
});
