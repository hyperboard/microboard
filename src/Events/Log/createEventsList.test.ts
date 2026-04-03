import { createEventsList } from "./createEventsList";
import { HistoryRecord } from "./EventsLog";
import { ApplyMatrixOperation } from "Geometry/Transformation/TransformationOperations";
import { SelectionOp } from "Items/RichText/RichTextOperations";
import { Operation } from "../EventsOperations";

function createCommandStub() {
  return {
    apply() {},
    revert() {},
  } as any;
}

function createRecord(eventId: string, operation: Operation): HistoryRecord {
  return {
    event: {
      order: 0,
      body: {
        eventId,
        userId: 1,
        boardId: "board-1",
        operation,
      },
    },
    command: createCommandStub(),
  };
}

function createMatrixOp(
  translateX: number,
  translateY: number,
  timeStamp = 1
): ApplyMatrixOperation {
  return {
    class: "Transformation",
    method: "applyMatrix",
    timeStamp,
    items: [
      {
        id: "shape-1",
        matrix: {
          translateX,
          translateY,
          scaleX: 1,
          scaleY: 1,
          shearX: 0,
          shearY: 0,
        },
      },
    ],
  };
}

function createEditOp(offset: number, text: string): SelectionOp {
  return {
    class: "RichText",
    method: "edit",
    item: ["text-1"],
    selection: {
      anchor: { path: [0, 0], offset },
      focus: { path: [0, 0], offset },
    },
    ops: [
      {
        type: "insert_text",
        path: [0, 0],
        offset,
        text,
      },
    ],
  };
}

describe("createEventsList", () => {
  test("merges consecutive local mergeable records before they are sent", () => {
    const list = createEventsList(() => createCommandStub());

    list.addNewRecords([
      createRecord("1:1", createMatrixOp(1, 2)),
      createRecord("1:2", createMatrixOp(3, 4)),
    ]);

    const newRecords = list.getNewRecords();
    expect(newRecords).toHaveLength(1);
    expect(newRecords[0].event.body.eventId).toBe("1:1");
    expect(newRecords[0].event.body.operation).toMatchObject({
      class: "Transformation",
      method: "applyMatrix",
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

  test("does not move newly queued records into recordsToSend while a send batch is still pending", () => {
    const list = createEventsList(() => createCommandStub());

    list.addNewRecords([createRecord("1:1", createMatrixOp(1, 0))]);
    const firstBatch = list.prepareRecordsToSend();
    expect(firstBatch.map((record) => record.event.body.eventId)).toEqual(["1:1"]);

    list.addNewRecords([createRecord("1:2", createMatrixOp(2, 0))]);
    const secondBatch = list.prepareRecordsToSend();

    expect(secondBatch.map((record) => record.event.body.eventId)).toEqual(["1:1"]);
    expect(list.getRecordsToSend().map((record) => record.event.body.eventId)).toEqual(["1:1"]);
    expect(list.getNewRecords().map((record) => record.event.body.eventId)).toEqual(["1:2"]);
  });

  test("transforms unconfirmed local records against just-confirmed events before reapplying", () => {
    const list = createEventsList(() => createCommandStub());

    const localRecord = createRecord("1:1", createEditOp(1, "L"));
    list.addNewRecords([localRecord]);
    list.prepareRecordsToSend();

    const confirmedRecord = createRecord("2:1", createEditOp(0, "R"));
    list.justConfirmed.push(confirmedRecord);

    list.applyUnconfirmed();

    const transformed = list.getRecordsToSend()[0].event.body.operation as SelectionOp;
    expect(transformed.ops).toHaveLength(1);
    expect(transformed.ops[0]).toMatchObject({
      type: "insert_text",
      path: [0, 0],
      offset: 2,
      text: "L",
    });
    expect(list.justConfirmed).toHaveLength(0);
  });
});
