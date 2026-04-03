import { RichTextOperation } from "Items/RichText/RichTextOperations";
import { TransformationOperation } from "Geometry/Transformation/TransformationOperations";
import { ConnectorOperation } from "Items/Connector/ConnectorOperations";
import { Path } from "slate";
import { BoardOps, DataMap } from "BoardOperations";
import { RichTextData } from "Items/RichText/RichTextData";
import { Operation, isTransformation, isBoardOp, isRichTextOp } from "./EventsOperations";
import { ShapeOperation } from "Items/Shape/ShapeOperation";
import { DrawingOperation } from "Items/Drawing/DrawingOperation";

// TODO API Conditional to Map
function canNotBeMerged(op: Operation): boolean {
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
  if (isTransformation(opA) && isTransformation(opB)) {
    if (opA.method === "transformMany" && opB.method === "transformMany") {
      const itemsA = Object.keys(opA.items);
      const itemsB = Object.keys(opB.items);
      const setA = new Set(itemsA);
      const setB = new Set(itemsB);

      const areArraysEqual =
        setA.size === setB.size && [...setA].every((item) => setB.has(item));
      return areArraysEqual;
    }
  }

  if (!("item" in opA) || !("item" in opB)) {
    return false;
  }

  const itemsA = Array.isArray(opA.item) ? opA.item : [opA.item];
  const itemsB = Array.isArray(opB.item) ? opB.item : [opB.item];

  if (itemsA.length !== itemsB.length) {
    return false;
  }
  for (let i = 0; i < itemsA.length; i++) {
    if (itemsA[i] !== itemsB[i]) {
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

  if (opA.method === "setProperty") {
    return mergeSetPropertyOperations(opA as any, opB as any);
  }

  if (opA.class === "Board" && opB.class === "Board") {
    return mergeBoardOperations(opA as any, opB as any);
  }

  if (opA.class === "Transformation" && opB.class === "Transformation") {
    return mergeTransformationOperations(opA as any, opB as any);
  }

  if (opA.class === "RichText" && opB.class === "RichText") {
    return mergeRichTextOperations(opA as any, opB as any);
  }

  if (opA.class === "Connector" && opB.class === "Connector") {
    return mergeConnectorOperations(opA as any, opB as any);
  }

  if (opA.class === "Shape" && opB.class === "Shape") {
    return mergeShapeOperations(opA as any, opB as any);
  }

  if (opA.class === "Drawing" && opB.class === "Drawing") {
    return mergeDrawingOperations(opA as any, opB as any);
  }
  return;
}

function mergeTransformationOperations(
  opA: TransformationOperation,
  opB: TransformationOperation
): TransformationOperation | undefined {
  if (opA.timeStamp && opB.timeStamp && opA.timeStamp !== opB.timeStamp) {
    return;
  }

  if (opA.method === "applyMatrix" && opB.method === "applyMatrix") {
    if (opA.items.length !== opB.items.length) return;
    const idsA = new Set(opA.items.map(i => i.id));
    if (!opB.items.every(b => idsA.has(b.id))) return;
    return {
      class: "Transformation",
      method: "applyMatrix",
      items: opB.items.map(b => {
        const a = opA.items.find(i => i.id === b.id)!;
        return {
          id: b.id,
          matrix: {
            translateX: a.matrix.translateX + b.matrix.translateX,
            translateY: a.matrix.translateY + b.matrix.translateY,
            scaleX: a.matrix.scaleX * b.matrix.scaleX,
            scaleY: a.matrix.scaleY * b.matrix.scaleY,
            shearX: 0,
            shearY: 0,
          },
        };
      }),
      timeStamp: opB.timeStamp,
    };
  }

  if (!areItemsTheSame(opA, opB)) {
    return;
  }

  // @deprecated — legacy event merging only, new events use applyMatrix
  const anyOpA = opA as any;
  const anyOpB = opB as any;
  const method = anyOpA.method;
  switch (method) {
    case "translateBy":
      if (anyOpB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "translateBy",
        item: anyOpA.item,
        x: anyOpA.x + anyOpB.x,
        y: anyOpA.y + anyOpB.y,
        timeStamp: anyOpB.timeStamp,
      } as any;
    case "scaleBy":
      if (anyOpB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "scaleBy",
        item: anyOpA.item,
        x: anyOpA.x * anyOpB.x,
        y: anyOpA.y * anyOpB.y,
        timeStamp: anyOpB.timeStamp,
      } as any;
    case "rotateBy":
      if (anyOpB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "rotateBy",
        item: anyOpA.item,
        degree: anyOpA.degree + anyOpB.degree,
        timeStamp: anyOpB.timeStamp,
      } as any;
    case "scaleByTranslateBy":
      if (anyOpB.method !== method) {
        return;
      }
      return {
        class: "Transformation",
        method: "scaleByTranslateBy",
        item: anyOpA.item,
        scale: {
          x: anyOpA.scale.x * anyOpB.scale.x,
          y: anyOpA.scale.y * anyOpB.scale.y,
        },
        translate: {
          x: anyOpA.translate.x + anyOpB.translate.x,
          y: anyOpA.translate.y + anyOpB.translate.y,
        },
        timeStamp: anyOpB.timeStamp,
      } as any;
    // end @deprecated
    default:
      return;
  }
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
    const data = opA.data as RichTextData;
    if (!data.children || !data.children[0] || !('children' in data.children[0])) {
      return;
    }
    const firstLevelChild = data.children[0];
    if (!firstLevelChild.children || !firstLevelChild.children[0] || !('text' in firstLevelChild.children[0])) {
      return;
    }
    const secondLevelChild = firstLevelChild.children[0];

    const op: BoardOps = {
      ...opA,
      method: "add",
      data: {
        ...data,
        itemType: "RichText",
        children: [
          {
            ...firstLevelChild,
            children: [
              {
                ...secondLevelChild,
                text: secondLevelChild.text + opB.ops[0].text,
              },
            ],
          },
        ],
      },
    } as BoardOps;
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

function mergeSetPropertyOperations(
  opA: any,
  opB: any
): any | undefined {
  if (!areItemsTheSame(opA, opB)) {
    return;
  }
  if (opA.property !== opB.property) {
    return;
  }
  return {
    ...opB,
    prevValue: opA.prevValue,
  };
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

    const mergedOp: BoardOps = {
      ...opB,
      item: [...opAItems, ...opBItems],
      data: { ...(opAData as DataMap), ...(opBData as DataMap) },
    } as BoardOps;
    return mergedOp;
  }

  return undefined;
}
