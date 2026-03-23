import { initNodeSettings } from "api/initNodeSettings";
initNodeSettings();

import { Board } from "Board";
import { createEvents } from "../Events";
import { createEventsList } from "./createEventsList";
import { getUnpublishedEventFromList } from "./getUnpublishedEventFromList";
import { HistoryRecord } from "./EventsLog";
import { ApplyMatrixOperation } from "Items/Transformation/TransformationOperations";
import { handleConfirmation } from "../MessageRouter/handleConfirmation";
import { Connection, conf } from "Settings";

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

function createTransformationRecord(
  eventId: string,
  operation: ApplyMatrixOperation
): HistoryRecord {
  return {
    event: {
      order: 0,
      body: {
        eventId,
        userId: "session-77",
        sessionId: "session-77",
        authorUserId: "user-1",
        boardId: "test-board",
        operation,
      },
    },
    command: {
      apply: () => {},
      revert: () => {},
    } as any,
  };
}

describe("getUnpublishedEventFromList", () => {
  test("merges sequential local transformation records into a compact outbound pack", () => {
    const eventsList = createEventsList(() => ({ apply() {}, revert() {} } as any));

    const first: ApplyMatrixOperation = {
      class: "Transformation",
      method: "applyMatrix",
      timeStamp: 1,
      items: [
        {
          id: "shape-1",
          matrix: {
            translateX: 1,
            translateY: 2,
            scaleX: 1,
            scaleY: 1,
            shearX: 0,
            shearY: 0,
          },
        },
      ],
    };
    const second: ApplyMatrixOperation = {
      class: "Transformation",
      method: "applyMatrix",
      timeStamp: 1,
      items: [
        {
          id: "shape-1",
          matrix: {
            translateX: 3,
            translateY: 4,
            scaleX: 1,
            scaleY: 1,
            shearX: 0,
            shearY: 0,
          },
        },
      ],
    };

    eventsList.addNewRecords([
      createTransformationRecord("77:1", first),
      createTransformationRecord("77:2", second),
    ]);

    const unpublishedBatch = getUnpublishedEventFromList(eventsList);

    expect(unpublishedBatch).not.toBeNull();
    expect(unpublishedBatch?.sentEventIds).toEqual(["77:1"]);
    expect(unpublishedBatch?.event.body.sessionId).toBe("session-77");
    expect(unpublishedBatch?.event.body.authorUserId).toBe("user-1");
    expect(unpublishedBatch?.event.body.userId).toBe("session-77");
    expect(unpublishedBatch?.event.body.operations).toHaveLength(1);
    expect(unpublishedBatch?.event.body.operations[0]).toMatchObject({
      class: "Transformation",
      method: "applyMatrix",
      actualId: "77:1",
      items: [
        {
          id: "shape-1",
          matrix: {
            translateX: 4,
            translateY: 6,
            scaleX: 1,
            scaleY: 1,
            shearX: 0,
            shearY: 0,
          },
        },
      ],
    });
  });

  test("confirmation clears every original local record that was merged into the sent pack", () => {
    const connection = createConnection(77);
    conf.connection = connection;

    const board = new Board("test-board");
    board.events = createEvents(board, connection, 0);

    const first: ApplyMatrixOperation = {
      class: "Transformation",
      method: "applyMatrix",
      timeStamp: 1,
      items: [
        {
          id: "shape-1",
          matrix: {
            translateX: 1,
            translateY: 0,
            scaleX: 1,
            scaleY: 1,
            shearX: 0,
            shearY: 0,
          },
        },
      ],
    };
    const second: ApplyMatrixOperation = {
      class: "Transformation",
      method: "applyMatrix",
      timeStamp: 1,
      items: [
        {
          id: "shape-1",
          matrix: {
            translateX: 2,
            translateY: 0,
            scaleX: 1,
            scaleY: 1,
            shearX: 0,
            shearY: 0,
          },
        },
      ],
    };

    board.events.log.insertNewLocalEventRecordAfterEmit(
      createTransformationRecord("77:1", first)
    );
    board.events.log.insertNewLocalEventRecordAfterEmit(
      createTransformationRecord("77:2", second)
    );

    const unpublishedBatch = board.events.log.getUnpublishedEvent();
    expect(unpublishedBatch).not.toBeNull();

    board.events.log.pendingEvent = {
      ...unpublishedBatch!,
      sequenceNumber: 3,
      lastSentTime: Date.now(),
    };

    handleConfirmation(
      {
        type: "Confirmation",
        boardId: board.getBoardId(),
        sequenceNumber: 3,
        order: 10,
      },
      board
    );

    expect(board.events.log.list.getRecordsToSend()).toHaveLength(0);
    expect(board.events.log.list.getConfirmedRecords()).toHaveLength(1);
    expect(board.events.log.list.getConfirmedRecords()[0].event.order).toBe(10);
  });
});
