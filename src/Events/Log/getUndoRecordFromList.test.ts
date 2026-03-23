import { createEventsList } from "./createEventsList";
import { getUndoRecordFromList } from "./getUndoRecordFromList";
import { HistoryRecord } from "./EventsLog";
import { Operation } from "../EventsOperations";

function createCommandStub() {
  return {
    apply() {},
    revert() {},
  } as any;
}

function createRecord(
  eventId: string,
  operation: Operation,
  {
    sessionId,
    authorUserId = "user-1",
    userId,
  }: { sessionId?: string; authorUserId?: string; userId?: string | number }
): HistoryRecord {
  return {
    event: {
      order: 1,
      body: {
        eventId,
        boardId: "board-1",
        operation,
        sessionId,
        authorUserId,
        userId,
      },
    },
    command: createCommandStub(),
  };
}

function createAddOp(item: string): Operation {
  return {
    class: "Board",
    method: "add",
    item,
    data: {} as any,
  };
}

describe("getUndoRecordFromList", () => {
  test("returns only records from the current session even when the author matches", () => {
    const list = createEventsList(() => createCommandStub());

    list.addConfirmedRecords([
      createRecord("same-user-other-session", createAddOp("remote"), {
        sessionId: "session-2",
        authorUserId: "user-1",
        userId: "session-2",
      }),
      createRecord("current-session", createAddOp("local"), {
        sessionId: "session-1",
        authorUserId: "user-1",
        userId: "session-1",
      }),
    ]);

    const undoRecord = getUndoRecordFromList(["session-1", "77"], list);
    expect(undoRecord?.event.body.eventId).toBe("current-session");
  });

  test("falls back to legacy body.userId when sessionId is absent", () => {
    const list = createEventsList(() => createCommandStub());

    list.addConfirmedRecords([
      createRecord("legacy-session", createAddOp("legacy"), {
        userId: 77,
      }),
    ]);

    const undoRecord = getUndoRecordFromList(["77"], list);
    expect(undoRecord?.event.body.eventId).toBe("legacy-session");
  });
});
