import { TransformManyItems } from "Items/Transformation/TransformationOperations";
import {
  getProportionalResize,
  getResize,
} from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { Mbr } from "Items/Mbr/Mbr";
import { Sticker } from "Items/Sticker/Sticker";
import { handleMultipleItemsResize } from "Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import { Shape } from "Items/Shape/Shape";
import { Frame } from "Items/Frame/Frame";
import { Board } from "Board";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { Point } from "Items/Point/Point";
import { Comment } from "Items/Comment/Comment";

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
}): { resizedMbr: Mbr; translation: TransformManyItems | null } {
  let translation: TransformManyItems | null = null;
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
    const resizedMbr = single.doResize(
      resizeType,
      board.pointer.point,
      mbr,
      oppositePoint,
      startMbr || new Mbr(),
      Date.now()
    ).mbr;

    if (followingComments) {
      const { matrix, mbr: resizedMbr } =
        single instanceof Sticker
          ? getProportionalResize(
              resizeType,
              board.pointer.point,
              mbr,
              oppositePoint
            )
          : getResize(resizeType, board.pointer.point, mbr, oppositePoint);
      translation = handleMultipleItemsResize({
        board,
        resize: { matrix, mbr: resizedMbr },
        initMbr: mbr,
        isWidth,
        isHeight,
        itemsToResize: followingComments,
        isShiftPressed: isShiftPressed,
      });
    }
    return { resizedMbr, translation };
  }
}
