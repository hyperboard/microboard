import { Matrix } from "Items/Transformation/Matrix";
import { Mbr } from "Items/Mbr/Mbr";
import type { Item } from "Items/Item";
import {
  ApplyMatrixItem,
} from "Items/Transformation/TransformationOperations";
import type { RichText } from "Items/RichText/RichText";
import type { AINode } from "Items/AINode/AINode";
import type { Sticker } from "Items/Sticker/Sticker";
import { Board } from "Board";

export function handleMultipleItemsResize({
  board,
  resize,
  itemsToResize,
  isHeight,
  isWidth,
  initMbr,
  isShiftPressed,
}: {
  board: Board;
  resize: { matrix: Matrix; mbr: Mbr };
  initMbr: Mbr;
  isWidth: boolean;
  isHeight: boolean;
  isShiftPressed: boolean;
  itemsToResize?: Item[];
}): ApplyMatrixItem[] {
  const { matrix } = resize;
  const result: ApplyMatrixItem[] = [];
  const rawItems = itemsToResize ? itemsToResize : board.selection.items.list();
  board.items.getComments().forEach((comment) => {
    if (rawItems.some((item) => item.getId() === comment.getItemToFollow())) {
      rawItems.push(comment as any);
    }
  });

  // Build set of selected IDs so we can skip children whose container is also
  // being resized (they follow the container via the transform hierarchy).
  const selectedIds = new Set(rawItems.map((i) => i.getId()));
  const items = rawItems.filter(
    (item) => item.parent === "Board" || !selectedIds.has(item.parent)
  );

  for (const item of items) {
    // Use world-space position for the resize delta calculation so that nested
    // items (which store local transforms) are placed correctly relative to
    // the world-space initMbr.
    const worldMbr = (item as any).getWorldMbr ? (item as any).getWorldMbr() : item.getMbr();
    let itemX = worldMbr.left;
    let itemY = worldMbr.top;

    if (item.itemType === "Drawing") {
      // Drawing items use transform origin directly; for nested Drawings use world position.
      if (item.parent !== "Board") {
        const worldMatrix = (item as any).getWorldMatrix ? (item as any).getWorldMatrix() : (item as any).transformation.toMatrix();
        itemX = worldMatrix.translateX;
        itemY = worldMatrix.translateY;
      } else {
        itemX = (item as any).transformation.getMatrixData().translateX;
        itemY = (item as any).transformation.getMatrixData().translateY;
      }
    }

    const deltaX = itemX - initMbr.left;
    const translateX = deltaX * matrix.scaleX - deltaX + matrix.translateX;
    const deltaY = itemY - initMbr.top;
    const translateY = deltaY * matrix.scaleY - deltaY + matrix.translateY;

    if (item.itemType === "RichText") {
      result.push(getRichTextTranslation({
        item: item as unknown as RichText,
        isWidth,
        isHeight,
        matrix,
        translateX,
        translateY,
      }));
    } else if (item.itemType === "AINode") {
      result.push(getAINodeTranslation({
        item: item as unknown as AINode,
        isWidth,
        isHeight,
        matrix,
        translateX,
        translateY,
      }));
    } else {
      result.push(getItemTranslation({
        item: item as any,
        isWidth,
        isHeight,
        matrix,
        translateX,
        translateY,
        isShiftPressed,
      }));
    }
  }

  return result;
}

function getRichTextTranslation({
  item,
  isWidth,
  isHeight,
  matrix,
  translateX,
  translateY,
}: {
  isWidth: boolean;
  isHeight: boolean;
  item: RichText;
  matrix: Matrix;
  translateX: number;
  translateY: number;
}): ApplyMatrixItem {
  if (isWidth) {
    item.editor.setMaxWidth(
      (item.getWidth() / (item as any).transformation.getScale().x) * matrix.scaleX
    );
    return { id: item.getId(), matrix: { translateX: matrix.translateX, translateY: 0, scaleX: matrix.scaleX, scaleY: matrix.scaleX, shearX: 0, shearY: 0 } };
  } else if (isHeight) {
    return { id: item.getId(), matrix: { translateX, translateY, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 } };
  } else {
    return { id: item.getId(), matrix: { translateX, translateY, scaleX: matrix.scaleX, scaleY: matrix.scaleX, shearX: 0, shearY: 0 } };
  }
}

function getAINodeTranslation({
  item,
  isWidth,
  isHeight,
  matrix,
  translateX,
  translateY,
}: {
  isWidth: boolean;
  isHeight: boolean;
  item: AINode;
  matrix: Matrix;
  translateX: number;
  translateY: number;
}): ApplyMatrixItem {
  if (isWidth) {
    item.text.editor.setMaxWidth(
      (item.text.getWidth() / (item as any).transformation.getScale().x) * matrix.scaleX
    );
    return { id: item.getId(), matrix: { translateX: matrix.translateX, translateY: 0, scaleX: matrix.scaleX, scaleY: matrix.scaleX, shearX: 0, shearY: 0 } };
  } else if (isHeight) {
    return { id: item.getId(), matrix: { translateX, translateY, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 } };
  } else {
    return { id: item.getId(), matrix: { translateX, translateY, scaleX: matrix.scaleX, scaleY: matrix.scaleX, shearX: 0, shearY: 0 } };
  }
}

function getItemTranslation({
  item,
  isWidth,
  isHeight,
  matrix,
  translateX,
  translateY,
  isShiftPressed,
}: {
  isWidth: boolean;
  isHeight: boolean;
  item: Item;
  matrix: Matrix;
  translateX: number;
  translateY: number;
  isShiftPressed: boolean;
}): ApplyMatrixItem {
  if (item.itemType === "Sticker" && (isWidth || isHeight)) {
    return { id: item.getId(), matrix: { translateX, translateY, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 } };
  } else {
    if (
      item.itemType === "Frame" &&
      (item as any).getCanChangeRatio() &&
      isShiftPressed &&
      (item as any).getFrameType() !== "Custom"
    ) {
      (item as any).setFrameType("Custom");
    }
    return { id: item.getId(), matrix: { translateX, translateY, scaleX: matrix.scaleX, scaleY: matrix.scaleY, shearX: 0, shearY: 0 } };
  }
}
