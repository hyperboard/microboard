import {
  getProportionalResize,
  getResize,
} from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { ImageItem } from "Items/Image/Image";
import { tempStorage } from "SessionStorage";
import { handleMultipleItemsResize } from "Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import { Point } from "Items/Point/Point";
import { Board } from "Board";
import { BoardSelection } from "Selection/Selection";
import { CanvasDrawer } from "drawMbrOnCanvas";
import AlignmentHelper from "Tools/RelativeAlignment";
import { Mbr } from "Items/Mbr/Mbr";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { DebounceUpdater } from "Tools/DebounceUpdater/DebounceUpdater";
import { Item } from "Items/Item";
import {Frame} from "../../../Items";

export function transformItems({
  board,
  selection,
  canvasDrawer,
  alignmentHelper,
  debounceUpd,
  resizeType,
  mbr,
  oppositePoint,
  isWidth,
  isHeight,
  isShiftPressed,
  beginTimeStamp,
  single,
  snapCursorPos,
  setSnapCursorPos,
}: {
  board: Board;
  snapCursorPos: Point | null;
  selection: BoardSelection;
  canvasDrawer: CanvasDrawer;
  alignmentHelper: AlignmentHelper;
  debounceUpd: DebounceUpdater;
  resizeType: ResizeType;
  mbr: Mbr;
  oppositePoint: Point;
  isWidth: boolean;
  isHeight: boolean;
  isShiftPressed: boolean;
  beginTimeStamp: number;
  single: Item | null;
  setSnapCursorPos: (pos: Point | null) => void;
}): Mbr | null {
  const items = selection.items.list();
  const includesProportionalItem = items.some(
    (item) =>
      item.itemType === "Sticker" ||
      item.itemType === "RichText" ||
      item.itemType === "AINode" ||
      item.itemType === "Video" ||
      item.itemType === "Audio"
  );

  if (includesProportionalItem && (isWidth || isHeight)) {
    return null;
  }

  const isIncludesFixedFrame = items.some(
    (item) => item instanceof Frame && !item.getCanChangeRatio()
  );

  const shouldBeProportionalResize =
    isIncludesFixedFrame ||
    includesProportionalItem ||
    isShiftPressed ||
    (!isWidth && !isHeight);

  const resize = shouldBeProportionalResize
    ? getProportionalResize(resizeType, board.pointer.point, mbr, oppositePoint)
    : getResize(resizeType, board.pointer.point, mbr, oppositePoint);

  if (canvasDrawer.getLastCreatedCanvas() && !debounceUpd.shouldUpd()) {
    canvasDrawer.recoordinateCanvas(resize.mbr);
    canvasDrawer.scaleCanvasTo(resize.matrix.scaleX, resize.matrix.scaleY);
    return null;
  }

  if (single instanceof ImageItem) {
    tempStorage.setImageDimensions({
      width: resize.mbr.getWidth(),
      height: resize.mbr.getHeight(),
    });
  }

  if (canvasDrawer.getLastCreatedCanvas() && debounceUpd.shouldUpd()) {
    const translation = handleMultipleItemsResize({
      board,
      resize,
      initMbr: mbr,
      isWidth,
      isHeight,
      isShiftPressed,
    });
    selection.transformMany(translation, beginTimeStamp);
    canvasDrawer.clearCanvasAndKeys();
    return resize.mbr;
  }

  const snapLines = alignmentHelper.checkAlignment(items);
  const snapped = alignmentHelper.snapToSide(
    items,
    snapLines,
    beginTimeStamp,
    resizeType
  );

  if (snapped) {
    const increasedSnapThreshold = 5;
    const pointerX = board.pointer.point.x;
    const pointerY = board.pointer.point.y;

    if (!snapCursorPos) {
      setSnapCursorPos(new Point(pointerX, pointerY));
    }

    const cursorDiffX = Math.abs(pointerX - (snapCursorPos?.x || pointerX));
    const cursorDiffY = Math.abs(pointerY - (snapCursorPos?.y || pointerY));

    // Disable snapping if the pointer moves more than 5 pixels
    if (
      cursorDiffX > increasedSnapThreshold ||
      cursorDiffY > increasedSnapThreshold
    ) {
      setSnapCursorPos(null); // Reset snapping
      const translation = handleMultipleItemsResize({
        board,
        resize,
        initMbr: mbr,
        isWidth,
        isHeight,
        isShiftPressed,
      });
      selection.transformMany(translation, beginTimeStamp);
      return null;
    }

    // If snapping is active, prevent resizing of the selection border
    return alignmentHelper.combineMBRs(selection.items.list());
  }

  snapCursorPos = null; // Reset snapping state
  const translation = handleMultipleItemsResize({
    board,
    resize,
    initMbr: mbr,
    isWidth,
    isHeight,
    isShiftPressed,
  });
  selection.transformMany(translation, beginTimeStamp);

  if (Object.keys(translation).length > 10) {
    canvasDrawer.updateCanvasAndKeys(resize.mbr, translation, resize.matrix);
    debounceUpd.setFalse();
    debounceUpd.setTimeoutUpdate(1000);
  }

  return alignmentHelper.combineMBRs(selection.items.list());
}
