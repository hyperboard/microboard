import {
  RichTextOperation,
  TransformationOperation,
  ConnectorOperation,
} from "Items";
import { Path } from "slate";
import { Operation } from "./EventsOperations";
import { type ShapeOperation } from "Items/Shape";
import { DrawingOperation } from "Items/Drawing/DrawingOperation";
import { BoardOps } from "BoardOperations";

// TODO API Conditional to Map
export function canNotBeMerged(op: Operation): boolean {
  if (op.class === "Transformation") {
    return false;
  }
  if (op.class === "RichText" && op.method === "edit") {
    return false;
  }
  if (
    op.class === "Connector" &&
    (op.method === "setStartPoint" || op.method === "setEndPoint")
  ) {
    return false;
  }
  return true;
}

function areItemsTheSame(opA: Operation, opB: Operation): boolean {
  if (opA.method === "transformMany" && opB.method === "transformMany") {
    const itemsA = Object.keys(opA.items);
    const itemsB = Object.keys(opB.items);
    const setA = new Set(itemsA);
    const setB = new Set(itemsB);

    const areArraysEqual =
      setA.size === setB.size && [...setA].every((item) => setB.has(item));
    return areArraysEqual;
  }
  // @ts-expect-error incorrect type
  if (!(Array.isArray(opA.item) && Array.isArray(opB.item))) {
    return false;
  }
  // @ts-expect-error incorrect type
  if (opA.item.length !== opB.item.length) {
    return false;
  }
  // @ts-expect-error incorrect type
  for (let i = 0; i < opA.item.length; i++) {
    // @ts-expect-error incorrect type
    if (opA.item[i] !== opB.item[i]) {
      return false;
    }
  }
  return true;
}

export function mergeOperations(
  opA: Operation,
  opB: Operation
): Operation | undefined {
  if (
    opA.class === "Board" &&
    opA.method === "add" &&
    opA.data.itemType === "RichText" &&
    opB.method === "edit" &&
    opB.class === "RichText"
  ) {
    return mergeRichTextCreation(opA, opB);
  }

  if (opA.class !== opB.class) {
    return;
  }

  if (opA.method !== opB.method) {
    return;
  }

  if (opA.class === "Board" && opB.class === "Board") {
    return mergeBoardOperations(opA, opB);
  }

  if (opA.class === "Transformation" && opB.class === "Transformation") {
    return mergeTransformationOperations(opA, opB);
  }

  if (opA.class === "RichText" && opB.class === "RichText") {
    return mergeRichTextOperations(opA, opB);
  }

  if (opA.class === "Connector" && opB.class === "Connector") {
    return mergeConnectorOperations(opA, opB);
  }

  if (opA.class === "Shape" && opB.class === "Shape") {
    return mergeShapeOperations(opA, opB);
  }

  if (opA.class === "Drawing" && opB.class === "Drawing") {
    return mergeDrawingOperations(opA, opB);
  }
  return;
}

function mergeTransformationOperations(
  opA: TransformationOperation,
  opB: TransformationOperation
): TransformationOperation | undefined {
  if (!areItemsTheSame(opA, opB)) {
    return;
  }
  if (opA.timeStamp && opB.timeStamp && opA.timeStamp !== opB.timeStamp) {
    return;
  }
  const method = opA.method;
  switch (method) {
    case "translateBy":
      if (opB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "translateBy",
        item: opA.item,
        x: opA.x + opB.x,
        y: opA.y + opB.y,
        timeStamp: opB.timeStamp,
      };
    case "scaleBy":
      if (opB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "scaleBy",
        item: opA.item,
        x: opA.x * opB.x,
        y: opA.y * opB.y,
        timeStamp: opB.timeStamp,
      };
    case "rotateBy":
      if (opB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "rotateBy",
        item: opA.item,
        degree: opA.degree + opB.degree,
        timeStamp: opB.timeStamp,
      };
    case "scaleByTranslateBy":
      if (opB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "scaleByTranslateBy",
        item: opA.item,
        scale: {
          x: opA.scale.x * opB.scale.x,
          y: opA.scale.y * opB.scale.y,
        },
        translate: {
          x: opA.translate.x + opB.translate.x,
          y: opA.translate.y + opB.translate.y,
        },
        timeStamp: opB.timeStamp,
      };
    case "transformMany":
      const items = mergeItems(opA, opB);
      if (opB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "transformMany",
        // @ts-expect-error wrong items type
        items,
        timeStamp: opB.timeStamp,
      };
    default:
      return;
  }
}

function mergeItems(
  opA: TransformationOperation,
  opB: TransformationOperation
): { [key: string]: TransformationOperation } | undefined {
  if (opA.method === "transformMany" && opB.method === "transformMany") {
    interface Transformer {
      x: number;
      y: number;
    }
    const resolve = (
      currScale: Transformer,
      currTranslate: Transformer | undefined,
      opB: TransformationOperation
    ): { scale: Transformer; translate: Transformer } | undefined => {
      switch (opB.method) {
        case "scaleByTranslateBy":
          return {
            scale: {
              x: currScale ? currScale.x * opB.scale.x : opB.scale.x,
              y: currScale ? currScale.y * opB.scale.y : opB.scale.y,
            },
            translate: {
              x: currTranslate
                ? currTranslate.x + opB.translate.x
                : opB.translate.x,
              y: currTranslate
                ? currTranslate.y + opB.translate.y
                : opB.translate.y,
            },
          };
        case "scaleBy":
          return {
            scale: {
              x: currScale ? currScale.x * opB.x : opB.x,
              y: currScale ? currScale.y * opB.y : opB.y,
            },
            translate: {
              x: currTranslate ? currTranslate.x : 0,
              y: currTranslate ? currTranslate.y : 0,
            },
          };
        case "translateBy":
          return {
            scale: {
              x: currScale ? currScale.x : 1,
              y: currScale ? currScale.y : 1,
            },
            translate: {
              x: currTranslate ? currTranslate.x + opB.x : opB.x,
              y: currTranslate ? currTranslate.y + opB.y : opB.y,
            },
          };
      }
      return;
    };
    const items: { [key: string]: TransformationOperation } = {};
    Object.keys(opB.items).forEach((itemId) => {
      if (opA.items[itemId] !== undefined) {
        if (opA.items[itemId].method === "scaleByTranslateBy") {
          const newTransformation = resolve(
            opA.items[itemId].scale,
            opA.items[itemId].translate,
            opB.items[itemId]
          );
          items[itemId] = {
            class: "Transformation",
            method: "scaleByTranslateBy",
            item: [itemId],
            scale: newTransformation?.scale ?? { x: 0, y: 0 },
            translate: newTransformation?.translate ?? {
              x: 0,
              y: 0,
            },
          };
        } else if (opA.items[itemId].method === "scaleBy") {
          const newTransformation = resolve(
            { x: opA.items[itemId].x, y: opA.items[itemId].y },
            undefined,
            opB.items[itemId]
          );
          items[itemId] = {
            class: "Transformation",
            method: "scaleByTranslateBy",
            item: [itemId],
            // @ts-expect-error wrong type
            scale: newTransformation.scale,
            // @ts-expect-error wrong type
            translate: newTransformation.translate,
          };
        } else if (opA.items[itemId].method === "translateBy") {
          const newTransformation = resolve(
            // @ts-expect-error wrong type
            undefined,
            { x: opA.items[itemId].x, y: opA.items[itemId].y },
            opB.items[itemId]
          );
          items[itemId] = {
            class: "Transformation",
            method: "scaleByTranslateBy",
            item: [itemId],
            // @ts-expect-error wrong type
            scale: newTransformation.scale,
            // @ts-expect-error wrong type
            translate: newTransformation.translate,
          };
        }
      } else {
        items[itemId] = opB.items[itemId];
      }
    });
    return items;
  }
  return;
}

function mergeRichTextOperations(
  opA: RichTextOperation,
  opB: RichTextOperation
): RichTextOperation | undefined {
  if (!areItemsTheSame(opA, opB)) {
    return;
  }

  if (opA.method !== opB.method) {
    return;
  }

  if (opA.method !== "edit" || opB.method !== "edit") {
    return;
  }
  if (opA.ops.length !== 1 && opB.ops.length !== 1) {
    return;
  }

  const A = opA.ops[0];
  const B = opB.ops[0];

  if (
    A.type === "set_node" &&
    B.type === "set_node" &&
    "horisontalAlignment" in A.newProperties &&
    "horisontalAlignment" in B.newProperties
  ) {
    return {
      ...opB,
      ops: [...opA.ops, ...opB.ops],
    };
  }

  if (
    B.type === "insert_text" &&
    A.type === "insert_text" &&
    B.offset === A.offset + A.text.length &&
    Path.equals(B.path, A.path)
  ) {
    return {
      ...opB,
      ops: [
        {
          ...B,
          offset: A.offset,
          text: A.text + B.text,
        },
      ],
    };
  }

  if (
    B.type === "remove_text" &&
    A.type === "remove_text" &&
    B.offset + B.text.length === A.offset &&
    Path.equals(B.path, A.path)
  ) {
    return {
      ...opB,
      ops: [
        {
          ...B,
          offset: B.offset,
          text: B.text + A.text,
        },
      ],
    };
  }

  if (
    B.type === "split_node" &&
    A.type === "split_node" &&
    Path.isChild(A.path, B.path)
  ) {
    return {
      ...opB,
      ops: [...opA.ops, ...opB.ops],
    };
  }

  if (
    B.type === "merge_node" &&
    A.type === "merge_node" &&
    A.path.length === 1 &&
    A.path[0] === B.path[1]
  ) {
    return {
      ...opB,
      ops: [...opA.ops, ...opB.ops],
    };
  }

  return;
}

function mergeRichTextCreation(opA: BoardOps, opB: RichTextOperation) {
  if (
    opA.method === "add" &&
    opA.data.itemType === "RichText" &&
    opB.method === "edit" &&
    opA.item === opB.item[0] &&
    opB.ops[0].type === "insert_text"
  ) {
    const op = {
      ...opA,
      data: {
        ...opA.data,
        children: [
          {
            ...opA.data.children[0],
            children: [
              {
                ...opA.data.children[0].children[0],
                text: opA.data.children[0].children[0].text + opB.ops[0].text,
              },
            ],
          },
        ],
      },
    };
    return op;
  }
  return;
}

function mergeConnectorOperations(
  opA: ConnectorOperation,
  opB: ConnectorOperation
): ConnectorOperation | undefined {
  if (!areItemsTheSame(opA, opB)) {
    return;
  }

  if (
    ((opA.method === "setStartPoint" && opB.method === "setStartPoint") ||
      (opA.method === "setEndPoint" && opB.method === "setEndPoint")) &&
    opA.timestamp &&
    opB.timestamp &&
    opA.timestamp !== opB.timestamp
  ) {
    return;
  }

  if (opA.method === "setStartPoint" && opB.method === "setStartPoint") {
    return {
      ...opB,
    };
  }

  if (opA.method === "setEndPoint" && opB.method === "setEndPoint") {
    return {
      ...opB,
    };
  }

  return;
}

function mergeShapeOperations(
  opA: ShapeOperation,
  opB: ShapeOperation
): ShapeOperation | undefined {
  if (!areItemsTheSame(opA, opB)) {
    return;
  }
  if (opA.method === "setBorderWidth" && opB.method === "setBorderWidth") {
    return {
      ...opB,
      prevBorderWidth: opA.prevBorderWidth,
    };
  }

  return;
}

function mergeDrawingOperations(
  opA: DrawingOperation,
  opB: DrawingOperation
): DrawingOperation | undefined {
  if (opA.method === "setStrokeWidth" && opB.method === "setStrokeWidth") {
    return {
      ...opB,
      prevWidth: opA.prevWidth,
    };
  }
  return;
}

function mergeBoardOperations(
  opA: BoardOps,
  opB: BoardOps
): BoardOps | undefined {
  if (
    opA.method === "add" &&
    opB.method === "add" &&
    opA.timeStamp !== undefined &&
    opA.timeStamp === opB.timeStamp
  ) {
    const opBItems = Array.isArray(opB.item) ? opB.item : [opB.item];
    const opAItems = Array.isArray(opA.item) ? opA.item : [opA.item];

    const opBData = Array.isArray(opB.item)
      ? opB.data
      : { [opB.item]: opB.data };
    const opAData = Array.isArray(opA.item)
      ? opA.data
      : { [opA.item]: opA.data };

    return {
      ...opB,
      item: [...opAItems, ...opBItems],
      data: { ...opBData, ...opAData },
    };
  }

  return undefined;
}
