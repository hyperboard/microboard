import { Matrix } from "Items/Transformation/Matrix";
import { Mbr } from "Items/Mbr/Mbr";
import { Item } from "Items/Item";
import {
  ApplyMatrixItem,
} from "Items/Transformation/TransformationOperations";
import { RichText } from "Items/RichText/RichText";
import { AINode } from "Items/AINode/AINode";
import { Sticker } from "Items/Sticker/Sticker";
import { Board } from "Board";
import {Frame} from "../../../Items";

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
  const items = itemsToResize ? itemsToResize : board.selection.items.list();
  board.items.getComments().forEach((comment) => {
    if (items.some((item) => item.getId() === comment.getItemToFollow())) {
      items.push(comment);
    }
  });

  for (const item of items) {
    let itemX = item.getMbr().left;
    let itemY = item.getMbr().top;

    if (item.itemType === "Drawing") {
      itemX = item.transformation.getMatrixData().translateX;
      itemY = item.transformation.getMatrixData().translateY;
    }

    const deltaX = itemX - initMbr.left;
    const translateX = deltaX * matrix.scaleX - deltaX + matrix.translateX;
    const deltaY = itemY - initMbr.top;
    const translateY = deltaY * matrix.scaleY - deltaY + matrix.translateY;

    if (item instanceof RichText) {
      result.push(getRichTextTranslation({
        item,
        isWidth,
        isHeight,
        matrix,
        translateX,
        translateY,
      }));
    } else if (item instanceof AINode) {
      result.push(getAINodeTranslation({
        item,
        isWidth,
        isHeight,
        matrix,
        translateX,
        translateY,
      }));
    } else {
      result.push(getItemTranslation({
        item,
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
      (item.getWidth() / item.transformation.getScale().x) * matrix.scaleX
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
      (item.text.getWidth() / item.transformation.getScale().x) * matrix.scaleX
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
  if (item instanceof Sticker && (isWidth || isHeight)) {
    return { id: item.getId(), matrix: { translateX, translateY, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 } };
  } else {
    if (
      item instanceof Frame &&
      item.getCanChangeRatio() &&
      isShiftPressed &&
      item.getFrameType() !== "Custom"
    ) {
      item.setFrameType("Custom");
    }
    return { id: item.getId(), matrix: { translateX, translateY, scaleX: matrix.scaleX, scaleY: matrix.scaleY, shearX: 0, shearY: 0 } };
  }
}
