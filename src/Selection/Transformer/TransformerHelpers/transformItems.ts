import {
	getProportionalResize,
	getResize,
} from "Board/Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { ImageItem } from "Board/Items/Image/Image";
import { tempStorage } from "App/SessionStorage";
import { handleMultipleItemsResize } from "Board/Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import { Point } from "Board/Items/Point/Point";
import { Board } from "Board/Board";
import { Selection } from "Board/Selection/Selection";
import { CanvasDrawer } from "Board/drawMbrOnCanvas";
import AlignmentHelper from "Board/Tools/RelativeAlignment";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { ResizeType } from "Board/Selection/Transformer/TransformerHelpers/getResizeType";
import { DebounceUpdater } from "Board/Tools/DebounceUpdater/DebounceUpdater";

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
}: {
	board: Board;
	selection: Selection;
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
}): boolean {
	const items = selection.items.list();
	const includesProportionalItem = items.some(
		item =>
			item.itemType === "Sticker" ||
			item.itemType === "RichText" ||
			item.itemType === "AINode" ||
			item.itemType === "Video" ||
			item.itemType === "Audio",
	);

	if (includesProportionalItem && (isWidth || isHeight)) {
		return false;
	}

	const isIncludesFixedFrame = items.some(
		item => item.itemType === "Frame" && !item.getCanChangeRatio(),
	);

	const shouldBeProportionalResize =
		isIncludesFixedFrame ||
		includesProportionalItem ||
		isShiftPressed ||
		(!isWidth && !isHeight);

	const resize = shouldBeProportionalResize
		? getProportionalResize(
				resizeType,
				board.pointer.point,
				mbr,
				oppositePoint,
			)
		: getResize(resizeType, board.pointer.point, mbr, oppositePoint);

	if (canvasDrawer.getLastCreatedCanvas() && !debounceUpd.shouldUpd()) {
		canvasDrawer.recoordinateCanvas(resize.mbr);
		canvasDrawer.scaleCanvasTo(resize.matrix.scaleX, resize.matrix.scaleY);
		return false;
	}

	const single = items[0];
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
		return false;
	}

	const snapLines = alignmentHelper.checkAlignment(items);
	const snapped = alignmentHelper.snapToSide(
		items,
		snapLines,
		beginTimeStamp,
		resizeType,
	);

	let snapCursorPos: Point | null = null;
	if (snapped) {
		const increasedSnapThreshold = 5;

		if (!snapCursorPos) {
			snapCursorPos = new Point(
				board.pointer.point.x,
				board.pointer.point.y,
			);
		}

		const cursorDiffX = Math.abs(board.pointer.point.x - snapCursorPos.x);
		const cursorDiffY = Math.abs(board.pointer.point.y - snapCursorPos.y);

		// Disable snapping if the pointer moves more than 5 pixels
		if (
			cursorDiffX > increasedSnapThreshold ||
			cursorDiffY > increasedSnapThreshold
		) {
			snapCursorPos = null; // Reset snapping
			const translation = handleMultipleItemsResize({
				board,
				resize,
				initMbr: mbr,
				isWidth,
				isHeight,
				isShiftPressed,
			});
			selection.transformMany(translation, beginTimeStamp);
			return false;
		}

		// If snapping is active, prevent resizing of the selection border
		return false;
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
		canvasDrawer.updateCanvasAndKeys(
			resize.mbr,
			translation,
			resize.matrix,
		);
		debounceUpd.setFalse();
		debounceUpd.setTimeoutUpdate(1000);
	}

	return false;
}
