import { MoveItem } from "Items/Transformation/TransformationOperations";
import {
  getProportionalResize,
  getResize,
} from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { Mbr } from "Items/Mbr/Mbr";
import type { Sticker } from "Items/Sticker/Sticker";
import type { Shape } from "Items/Shape/Shape";
import type { Frame } from "Items/Frame/Frame";
import { Board } from "Board";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { handleMultipleItemsResize, getItemMove } from "Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import type { Point } from "Items/Point/Point";
import type { Comment } from "Items/Comment/Comment";

export function transformShape({
  mbr,
  board,
  single,
  oppositePoint,
  resizeType,
  isShiftPressed,
  isHeight,
  isWidth,
  startMbr,
  followingComments,
  beginTimeStamp,
}: {
  single: Sticker | Shape | Frame;
  board: Board;
  resizeType: ResizeType;
  mbr: Mbr;
  oppositePoint: Point;
  isShiftPressed: boolean;
  isWidth: boolean;
  isHeight: boolean;
  followingComments?: Comment[];
  startMbr?: Mbr;
  beginTimeStamp?: number;
}): { resizedMbr: Mbr; translation: MoveItem[] | null } {
  let translation: MoveItem[] | null = null;
  if (isShiftPressed && single.itemType !== "Sticker") {
    const { matrix, mbr: resizedMbr } = getProportionalResize(
      resizeType,
      board.pointer.point,
      mbr,
      oppositePoint
    );
    translation = handleMultipleItemsResize({
      board: board,
      resize: { matrix, mbr: resizedMbr },
      initMbr: mbr,
      isWidth,
      isHeight,
      isShiftPressed: isShiftPressed,
    });
    return { resizedMbr, translation };
  } else {
    const { matrix, mbr: resizedMbr } =
      single.itemType === "Sticker"
        ? getProportionalResize(
            resizeType,
            board.pointer.point,
            mbr,
            oppositePoint
          )
        : getResize(resizeType, board.pointer.point, mbr, oppositePoint);

    const deltaX = (single as any).getWorldMbr ? (single as any).getWorldMbr().left : single.getMbr().left;
    const itemX = deltaX - mbr.left;
    const translateX = itemX * matrix.scaleX - itemX + matrix.translateX;
    const itemY = ((single as any).getWorldMbr ? (single as any).getWorldMbr().top : single.getMbr().top) - mbr.top;
    const translateY = itemY * matrix.scaleY - itemY + matrix.translateY;

    translation = [getItemMove({
      item: single as any,
      isWidth,
      isHeight,
      matrix,
      translateX,
      translateY,
      isShiftPressed,
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
}
