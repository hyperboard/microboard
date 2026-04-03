import { getProportionalResize } from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { handleMultipleItemsResize, getRichTextMove } from "Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import { Mbr } from "Items/Mbr/Mbr";
import { Board } from "Board";
import type { RichText } from "Items/RichText/RichText";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { Point } from "Items/Point/Point";
import type { Comment } from "Items/Comment/Comment";
import { Matrix } from "Items/Transformation/Matrix";
import type { AINode } from "Items/AINode/AINode";
import { transformOps } from "Items/Transformation/transformOps";
import { MoveItem } from "Items/Transformation/TransformationOperations";
import { BaseItem } from "Items/BaseItem/BaseItem";

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
  followingComments?: Comment[];
}): { resizedMbr: Mbr; translation?: MoveItem[] | null; onPointerUpCb?: () => void } | null {
  const isLongText = single.getTextString().length > 5000;

  const { matrix, mbr: resizedMbr } = getProportionalResize(
    resizeType,
    board.pointer.point,
    mbr,
    oppositePoint
  );

  const getCommentsTranslation = () => {
    if (followingComments) {
      return handleMultipleItemsResize({
        board: board,
        resize: { matrix, mbr: resizedMbr },
        initMbr: mbr,
        isWidth,
        isHeight,
        itemsToResize: followingComments,
        isShiftPressed: isShiftPressed,
      });
    }
    return [];
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
      const onPointerUpCb = () => {
        board.pointer.setCursor("default");
        board.selection.shouldRenderItemsMbr = true;
        if (isLeft) {
          const world = (single as unknown as BaseItem).getWorldMatrix().copy();
          const prevWorld = world.getMatrixData();
          world.translateX += single.getWidth() - newWidth;
          single.apply(transformOps.move([{
            id: single.id,
            worldMatrix: world.getMatrixData(),
            prevWorldMatrix: prevWorld,
          }]));
        }
        single.editor.setMaxWidth(newWidth);
      };
      return {
        resizedMbr: getTransformedTextMbr(single, resizedMbr, isWidth),
        onPointerUpCb,
        translation: getCommentsTranslation(),
      };
    } else {
      single.editor.setMaxWidth(resizedMbr.getWidth() / single.getScale());
      
      const translation: MoveItem[] = [];
      const world = (single as unknown as BaseItem).getWorldMatrix().copy();
      const prevWorld = world.getMatrixData();
      world.translateX += matrix.translateX;
      translation.push({
        id: single.id,
        worldMatrix: world.getMatrixData(),
        prevWorldMatrix: prevWorld,
      });
      
      translation.push(...getCommentsTranslation());
      
      return {
        resizedMbr: getTransformedTextMbr(single, resizedMbr, isWidth),
        translation,
      };
    }
  } else {
    if (isLongText) {
      if (board.selection.shouldRenderItemsMbr) {
        board.selection.shouldRenderItemsMbr = false;
      }
      const cursor = resizeType === "rightBottom" || resizeType === "leftTop" ? "nwse-resize" : "nesw-resize";
      if (board.pointer.getCursor() !== cursor) {
        board.pointer.setCursor(cursor);
      }
      mbr = resizedMbr;
      const mbrWidth = mbr.getWidth();
      const mbrHeight = mbr.getHeight();
      const { left, top } = mbr;
      
      const onPointerUpCb = () => {
        board.pointer.setCursor("default");
        board.selection.shouldRenderItemsMbr = true;
        const scaleX = mbrWidth / single.getWidth();
        const scaleY = mbrHeight / single.getHeight();
        const translateX = left - single.getMbr().left;
        const translateY = top - single.getMbr().top;
        
        const world = (single as unknown as BaseItem).getWorldMatrix().copy();
        const prevWorld = world.getMatrixData();
        world.translateX += translateX;
        world.translateY += translateY;
        world.scaleX *= scaleX;
        world.scaleY *= scaleY;
        
        single.apply(transformOps.move([{
          id: single.id,
          worldMatrix: world.getMatrixData(),
          prevWorldMatrix: prevWorld,
        }], Date.now()));
      };

      return {
        resizedMbr: getTransformedTextMbr(single, resizedMbr, isWidth),
        onPointerUpCb,
        translation: getCommentsTranslation(),
      };
    } else {
      const translation: MoveItem[] = [];
      const world = (single as unknown as BaseItem).getWorldMatrix().copy();
      const prevWorld = world.getMatrixData();
      world.translateX += matrix.translateX;
      world.translateY += matrix.translateY;
      world.scaleX *= matrix.scaleX;
      world.scaleY *= matrix.scaleY;
      
      translation.push({
        id: single.id,
        worldMatrix: world.getMatrixData(),
        prevWorldMatrix: prevWorld,
      });
      
      translation.push(...getCommentsTranslation());

      return {
        resizedMbr: getTransformedTextMbr(single, resizedMbr, isWidth),
        translation,
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
    board.selection.moveMany(translation, Date.now());
  }
}
