import { MoveItem } from "Items/Transformation/TransformationOperations";
import {
  getProportionalResize,
  getResize,
} from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { Mbr } from "Items/Mbr/Mbr";
import type { AINode } from "Items/AINode/AINode";
import { Board } from "Board";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { handleMultipleItemsResize, getAINodeMove } from "Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import type { Point } from "Items/Point/Point";
import type { Comment } from "Items/Comment/Comment";

export function transformAINode({
  board,
  mbr,
  single,
  oppositePoint,
  resizeType,
  isShiftPressed,
  isHeight,
  isWidth,
  followingComments,
  beginTimeStamp,
}: {
  single: AINode;
  board: Board;
  resizeType: ResizeType;
  mbr: Mbr;
  oppositePoint: Point;
  isShiftPressed: boolean;
  isWidth: boolean;
  isHeight: boolean;
  followingComments?: Comment[];
  beginTimeStamp?: number;
}): { resizedMbr: Mbr; translation: MoveItem[] | null } {
  let translation: MoveItem[] | null = null;
  const { matrix, mbr: resizedMbr } =
    isShiftPressed
      ? getProportionalResize(resizeType, board.pointer.point, mbr, oppositePoint)
      : getResize(resizeType, board.pointer.point, mbr, oppositePoint);

  const deltaX = single.text.getMbr().left - mbr.left;
  const translateX = deltaX * matrix.scaleX - deltaX + matrix.translateX;
  const deltaY = single.text.getMbr().top - mbr.top;
  const translateY = deltaY * matrix.scaleY - deltaY + matrix.translateY;

  translation = [getAINodeMove({
    item: single,
    isWidth,
    isHeight,
    matrix,
    translateX,
    translateY,
  })];

  if (followingComments) {
    const extraTranslation = handleMultipleItemsResize({
      board,
      resize: { matrix, mbr: resizedMbr },
      initMbr: mbr,
      isWidth,
      isHeight,
      itemsToResize: followingComments,
      isShiftPressed: isShiftPressed,
    });
    translation.push(...extraTranslation);
  }

  return { resizedMbr, translation };
}
