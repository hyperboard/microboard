import { getProportionalResize } from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { handleMultipleItemsResize } from "Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import { Mbr } from "Items/Mbr/Mbr";
import { Board } from "Board";
import { RichText } from "Items/RichText/RichText";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { Point } from "Items/Point/Point";
import { Comment } from "Items/Comment/Comment";
import { Matrix } from "Items/Transformation/Matrix";
import { AINode } from "Items/AINode/AINode";

export function transformRichText({
  board,
  mbr,
  isWidth,
  resizeType,
  single,
  oppositePoint,
  isHeight,
  isShiftPressed,
  followingComments,
}: {
  board: Board;
  single: RichText;
  resizeType: ResizeType;
  mbr: Mbr;
  oppositePoint: Point;
  isWidth: boolean;
  isHeight: boolean;
  isShiftPressed: boolean;
  followingComments: Comment[] | undefined;
}): { resizedMbr: Mbr; onPointerUpCb?: () => void } | null {
  const isLongText = single.getTextString().length > 5000;

  const { matrix, mbr: resizedMbr } = getProportionalResize(
    resizeType,
    board.pointer.point,
    mbr,
    oppositePoint
  );

  const transformComments = () => {
    transformTextFollowingComments({
      board,
      mbr,
      matrix,
      resizedMbr,
      isWidth,
      isHeight,
      isShiftPressed,
      followingComments,
    });
  };

  if (isWidth) {
    if (isLongText) {
      const isLeft = resizeType === "left";
      if (board.selection.shouldRenderItemsMbr) {
        board.selection.shouldRenderItemsMbr = false;
      }
      if (board.pointer.getCursor() !== "w-resize") {
        board.pointer.setCursor("w-resize");
      }
      if (isLeft) {
        if (board.pointer.point.x >= mbr.right - 100) {
          return null;
        }
        mbr.left = board.pointer.point.x;
      } else {
        if (board.pointer.point.x <= mbr.left + 100) {
          return null;
        }
        mbr.right = board.pointer.point.x;
      }
      const newWidth = mbr.getWidth();
      transformComments();
      const onPointerUpCb = () => {
        board.pointer.setCursor("default");
        board.selection.shouldRenderItemsMbr = true;
        if (isLeft) {
          single.transformation.translateBy(single.getWidth() - newWidth, 0);
        }
        single.editor.setMaxWidth(newWidth);
      };
      return {
        resizedMbr: getTransformedTextMbr(single, resizedMbr, isWidth),
        onPointerUpCb,
      };
    } else {
      single.editor.setMaxWidth(resizedMbr.getWidth() / single.getScale());
      single.transformation.translateBy(matrix.translateX, 0);
      matrix.translateY = 0;
      matrix.scaleY = 1;
      transformComments();
      return {
        resizedMbr: getTransformedTextMbr(single, resizedMbr, isWidth),
      };
    }
  } else {
    if (isLongText) {
      if (board.selection.shouldRenderItemsMbr) {
        board.selection.shouldRenderItemsMbr = false;
      }
      switch (resizeType) {
        case "leftTop":
          if (board.pointer.getCursor() !== "nwse-resize") {
            board.pointer.setCursor("nwse-resize");
          }
          if (
            board.pointer.point.x >= mbr.right - 100 ||
            board.pointer.point.y >= mbr.bottom - 100
          ) {
            return null;
          }
          break;

        case "rightTop":
          if (board.pointer.getCursor() !== "nesw-resize") {
            board.pointer.setCursor("nesw-resize");
          }
          if (
            board.pointer.point.x <= mbr.left + 100 ||
            board.pointer.point.y >= mbr.bottom - 100
          ) {
            return null;
          }
          break;

        case "leftBottom":
          if (board.pointer.getCursor() !== "nesw-resize") {
            board.pointer.setCursor("nesw-resize");
          }
          if (
            board.pointer.point.x >= mbr.right - 100 ||
            board.pointer.point.y <= mbr.top + 100
          ) {
            return null;
          }
          break;

        case "rightBottom":
          if (board.pointer.getCursor() !== "nwse-resize") {
            board.pointer.setCursor("nwse-resize");
          }
          if (
            board.pointer.point.x <= mbr.left + 100 ||
            board.pointer.point.y <= mbr.top + 100
          ) {
            return null;
          }
          break;

        default:
          break;
      }
      mbr = resizedMbr;
      const mbrWidth = mbr.getWidth();
      const mbrHeight = mbr.getHeight();
      const { left, top } = mbr;
      transformComments();
      const onPointerUpCb = () => {
        board.pointer.setCursor("default");
        board.selection.shouldRenderItemsMbr = true;
        const scaleX = mbrWidth / single.getWidth();
        const scaleY = mbrHeight / single.getHeight();
        const translateX = left - single.left;
        const translateY = top - single.top;
        single.transformation.scaleByTranslateBy(
          { x: scaleX, y: scaleY },
          { x: translateX, y: translateY },
          Date.now()
        );
      };

      return {
        resizedMbr: getTransformedTextMbr(single, resizedMbr, isWidth),
        onPointerUpCb,
      };
    } else {
      single.transformation.scaleByTranslateBy(
        { x: matrix.scaleX, y: matrix.scaleY },
        { x: matrix.translateX, y: matrix.translateY },
        Date.now()
      );
      transformComments();
      return {
        resizedMbr: getTransformedTextMbr(single, resizedMbr, isWidth),
      };
    }
  }
}

export function getTransformedTextMbr(
  single: RichText | AINode,
  resizedMbr: Mbr,
  isWidth: boolean
): Mbr {
  if (isWidth) {
    const { left, top, bottom } = single.getMbr();
    return new Mbr(left, top, resizedMbr.right, bottom);
  } else {
    return single.getMbr();
  }
}

export function transformTextFollowingComments({
  followingComments,
  board,
  matrix,
  resizedMbr,
  isWidth,
  isHeight,
  mbr,
  isShiftPressed,
}: {
  followingComments?: Comment[];
  board: Board;
  matrix: Matrix;
  resizedMbr: Mbr;
  mbr: Mbr;
  isWidth: boolean;
  isHeight: boolean;
  isShiftPressed: boolean;
}): void {
  if (followingComments) {
    const translation = handleMultipleItemsResize({
      board: board,
      resize: { matrix, mbr: resizedMbr },
      initMbr: mbr,
      isWidth,
      isHeight,
      itemsToResize: followingComments,
      isShiftPressed: isShiftPressed,
    });
    board.selection.transformMany(translation, Date.now());
  }
}
