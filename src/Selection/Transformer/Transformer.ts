import { Board } from "Board";
import createCanvasDrawer, { CanvasDrawer } from "Board/drawMbrOnCanvas";
import {
	Frame,
	Item,
	Line,
	Matrix,
	Mbr,
	Point,
	RichText,
	Shape,
} from "Board/Items";
import { AINode } from "Board/Items/AINode/AINode";
import { Anchor } from "Board/Items/Anchor";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Geometry } from "Board/Items/Geometry";
import { Sticker } from "Board/Items/Sticker";
import { Selection } from "Board/Selection";
import { SelectionItems } from "Board/Selection/SelectionItems";
import { conf } from "Board/Settings";
import { createDebounceUpdater } from "Board/Tools/DebounceUpdater";
import { NestingHighlighter } from "Board/Tools/NestingHighlighter";
import AlignmentHelper from "Board/Tools/RelativeAlignment";
import { Tool } from "Board/Tools/Tool";
import {
	AnchorType,
	getAnchorFromResizeType,
} from "./TransformerHelpers/AnchorType.ts";
import { getOppositePoint } from "./TransformerHelpers/getOppositePoint.ts";
import {
	getProportionalResize,
	getResize,
} from "./TransformerHelpers/getResizeMatrix.ts";
import {
	getResizeType,
	ResizeType,
} from "./TransformerHelpers/getResizeType.ts";
import { getTextResizeType } from "./TextTransformer/getTextResizeType";
import { ImageItem } from "Board/Items/Image/Image";
import { tempStorage } from "App/SessionStorage";
import { getFollowingComments } from "Board/Selection/Transformer/TransformerHelpers/getFollowingComments";
import { handleMultipleItemsResize } from "Board/Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import { transformShape } from "Board/Selection/Transformer/TransformerHelpers/ransformShape";
import { transformRichText } from "Board/Selection/Transformer/TransformerHelpers/transformRichText";
import { transformAINode } from "Board/Selection/Transformer/TransformerHelpers/transformAINode";
import { transformItems } from "Board/Selection/Transformer/TransformerHelpers/transformItems";

export class Transformer extends Tool {
	anchorType: AnchorType = "default";
	resizeType?: ResizeType;
	oppositePoint?: Point;
	mbr: Mbr | undefined;
	// original mbr when resize was triggered
	startMbr: Mbr | undefined;
	clickedOn?: ResizeType;
	private nestingHighlighter = new NestingHighlighter();
	beginTimeStamp = Date.now();
	canvasDrawer: CanvasDrawer;
	debounceUpd = createDebounceUpdater();
	isShiftPressed = false;
	onPointerUpCb: null | (() => void) = null;
	private alignmentHelper: AlignmentHelper;
	private snapLines: { verticalLines: Line[]; horizontalLines: Line[] } = {
		verticalLines: [],
		horizontalLines: [],
	};
	private snapCursorPos: Point | null = null;
	private initialCursorPos: Point | null = null;

	constructor(
		private board: Board,
		private selection: Selection,
	) {
		super();
		this.canvasDrawer = createCanvasDrawer(board);

		selection.subject.subscribe(() => {
			if (!this.resizeType) {
				this.mbr = this.selection.getMbr();
			}
		});

		this.alignmentHelper = new AlignmentHelper(
			board,
			board.index,
			this.canvasDrawer,
			this.debounceUpd,
		);
	}

	updateAnchorType(): void {
		const pointer = this.board.pointer;
		const resizeType = this.getResizeType();
		const anchorType = getAnchorFromResizeType(resizeType);
		pointer.setCursor(anchorType);
		this.anchorType = anchorType;
	}

	keyDown(key: string): boolean {
		if (key === "Shift") {
			this.isShiftPressed = true;
			return true;
		}
		return false;
	}

	keyUp(key: string): boolean {
		if (key === "Shift") {
			this.isShiftPressed = false;
			return true;
		}
		return false;
	}

	getResizeType(): ResizeType | undefined {
		const mbr = this.selection.getMbr();
		const pointer = this.board.pointer;
		const camera = this.board.camera;
		const items = this.selection.items;
		const item = items.getSingle();

		let resizeType: ResizeType | undefined;
		if (
			item &&
			(item.itemType === "RichText" || item.itemType === "Sticker")
		) {
			resizeType = getTextResizeType(
				pointer.point,
				camera.getScale(),
				mbr,
			);
		} else {
			resizeType = getResizeType(pointer.point, camera.getScale(), mbr);
		}
		return resizeType;
	}

	updateAlignmentBySnapLines(single: Item | null): void {
		if (single) {
			this.snapLines = this.alignmentHelper.checkAlignment(single);
			const snapped = this.alignmentHelper.snapToSide(
				single,
				this.snapLines,
				this.beginTimeStamp,
				this.resizeType,
			);

			if (snapped) {
				this.mbr = single.getMbr();
			}
		}
	}

	leftButtonDown(): boolean {
		const isLockedItems = this.selection.getIsLockedSelection();
		if (isLockedItems) {
			return false;
		}

		this.updateAnchorType();
		const mbr = this.selection.getMbr();
		this.resizeType = this.getResizeType();
		this.clickedOn = this.getResizeType();
		if (this.resizeType && mbr) {
			this.oppositePoint = getOppositePoint(this.resizeType, mbr);
			this.mbr = mbr;
			this.startMbr = mbr;
		}
		this.beginTimeStamp = Date.now();
		return this.resizeType !== undefined;
	}

	leftButtonUp(): boolean {
		const isLockedItems = this.selection.getIsLockedSelection();
		if (isLockedItems) {
			return false;
		}

		if (this.onPointerUpCb) {
			this.onPointerUpCb();
			this.onPointerUpCb = null;
		}

		if (
			this.canvasDrawer.getLastCreatedCanvas() &&
			this.clickedOn &&
			this.mbr &&
			this.oppositePoint
		) {
			const isWidth =
				this.clickedOn === "left" || this.clickedOn === "right";
			const isHeight =
				this.clickedOn === "top" || this.clickedOn === "bottom";
			const resize = getProportionalResize(
				this.clickedOn,
				this.board.pointer.point,
				this.mbr,
				this.oppositePoint,
			);
			const translation = handleMultipleItemsResize({
				board: this.board,
				resize,
				initMbr: this.mbr,
				isWidth,
				isHeight,
				isShiftPressed: this.isShiftPressed,
			});
			this.selection.transformMany(translation, this.beginTimeStamp);
			this.mbr = resize.mbr;
			this.debounceUpd.setFalse();
		}

		this.updateAnchorType();
		const wasResising = this.resizeType !== undefined;
		if (wasResising) {
			this.selection.nestSelectedItems();
		}

		this.resizeType = undefined;
		this.clickedOn = undefined;
		this.oppositePoint = undefined;
		this.mbr = undefined;
		this.nestingHighlighter.clear();
		this.beginTimeStamp = Date.now();
		this.canvasDrawer.clearCanvasAndKeys();
		this.board.selection.subject.publish(this.board.selection);
		this.snapLines = { verticalLines: [], horizontalLines: [] };
		return wasResising;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.board.getInterfaceType() !== "edit") {
			return false;
		}
		const isLockedItems = this.selection.getIsLockedSelection();
		if (isLockedItems) {
			return false;
		}

		this.updateAnchorType();
		if (!this.resizeType) {
			return false;
		}

		const mbr = this.mbr;
		const list = this.selection.items.list();

		if (!mbr || list.length === 0 || !this.oppositePoint) {
			return false;
		}

		const isWidth =
			this.resizeType === "left" || this.resizeType === "right";
		const isHeight =
			this.resizeType === "top" || this.resizeType === "bottom";
		const single = this.selection.items.getSingle();
		const followingComments = getFollowingComments(this.board, single);

		if (single?.transformation.isLocked) {
			this.board.pointer.setCursor("default");
			return false;
		}

		this.updateAlignmentBySnapLines(single);

		if (
			single instanceof Shape ||
			single instanceof Sticker ||
			single instanceof Frame
		) {
			const { resizedMbr, translation } = transformShape({
				board: this.board,
				mbr,
				isWidth,
				isHeight,
				isShiftPressed: this.isShiftPressed,
				single,
				resizeType: this.resizeType,
				oppositePoint: this.oppositePoint,
				followingComments,
				startMbr: this.startMbr,
			});
			this.mbr = resizedMbr;
			if (translation) {
				this.selection.transformMany(translation, this.beginTimeStamp);
			}
		} else if (single instanceof RichText) {
			if (!this.mbr) {
				return false;
			}
			const transformationData = transformRichText({
				board: this.board,
				single,
				isWidth,
				isHeight,
				isShiftPressed: this.isShiftPressed,
				mbr,
				followingComments,
				oppositePoint: this.oppositePoint,
				resizeType: this.resizeType,
			});

			if (transformationData) {
				this.mbr = transformationData.resizedMbr;
				if (transformationData.onPointerUpCb) {
					this.onPointerUpCb = transformationData.onPointerUpCb;
				}
			}
		} else if (single instanceof AINode) {
			this.mbr = transformAINode({
				board: this.board,
				single,
				isWidth,
				isHeight,
				isShiftPressed: this.isShiftPressed,
				mbr,
				followingComments,
				oppositePoint: this.oppositePoint,
				resizeType: this.resizeType,
			});
		} else {
			// if (!transformItems({
			// 	mbr,
			// 	board: this.board,
			// 	isShiftPressed: this.isShiftPressed,
			// 	oppositePoint: this.oppositePoint,
			// 	resizeType: this.resizeType,
			// 	debounceUpd: this.debounceUpd,
			// 	alignmentHelper: this.alignmentHelper,
			// 	isWidth,
			// 	isHeight,
			// 	beginTimeStamp: this.beginTimeStamp,
			// 	canvasDrawer: this.canvasDrawer,
			// 	selection: this.selection,
			// })) {
			// 	return false;
			// }
			const items = this.selection.items.list();
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
				this.isShiftPressed ||
				(!isWidth && !isHeight);

			const resize = shouldBeProportionalResize
				? getProportionalResize(
						this.resizeType,
						this.board.pointer.point,
						mbr,
						this.oppositePoint,
					)
				: getResize(
						this.resizeType,
						this.board.pointer.point,
						mbr,
						this.oppositePoint,
					);

			if (
				this.canvasDrawer.getLastCreatedCanvas() &&
				!this.debounceUpd.shouldUpd()
			) {
				this.canvasDrawer.recoordinateCanvas(resize.mbr);
				this.canvasDrawer.scaleCanvasTo(
					resize.matrix.scaleX,
					resize.matrix.scaleY,
				);
				return false;
			}
			if (single instanceof ImageItem) {
				tempStorage.setImageDimensions({
					width: resize.mbr.getWidth(),
					height: resize.mbr.getHeight(),
				});
			}
			if (
				this.canvasDrawer.getLastCreatedCanvas() &&
				this.debounceUpd.shouldUpd()
			) {
				const translation = handleMultipleItemsResize({
					board: this.board,
					resize,
					initMbr: mbr,
					isWidth,
					isHeight,
					isShiftPressed: this.isShiftPressed,
				});
				this.selection.transformMany(translation, this.beginTimeStamp);
				this.canvasDrawer.clearCanvasAndKeys();
				this.mbr = resize.mbr;
			} else {
				this.snapLines = this.alignmentHelper.checkAlignment(items);
				const snapped = this.alignmentHelper.snapToSide(
					items,
					this.snapLines,
					this.beginTimeStamp,
					this.resizeType,
				);
				if (snapped) {
					const increasedSnapThreshold = 5;

					if (!this.snapCursorPos) {
						this.snapCursorPos = new Point(
							this.board.pointer.point.x,
							this.board.pointer.point.y,
						);
					}

					const cursorDiffX = Math.abs(
						this.board.pointer.point.x - this.snapCursorPos.x,
					);
					const cursorDiffY = Math.abs(
						this.board.pointer.point.y - this.snapCursorPos.y,
					);

					// Disable snapping if the pointer moves more than 5 pixels
					if (
						cursorDiffX > increasedSnapThreshold ||
						cursorDiffY > increasedSnapThreshold
					) {
						this.snapCursorPos = null; // Reset snapping
						this.snapLines = {
							verticalLines: [],
							horizontalLines: [],
						}; // Clear snap lines
						const translation = handleMultipleItemsResize({
							board: this.board,
							resize,
							initMbr: mbr,
							isWidth,
							isHeight,
							isShiftPressed: this.isShiftPressed,
						});
						this.selection.transformMany(
							translation,
							this.beginTimeStamp,
						);
						this.mbr = this.alignmentHelper.combineMBRs(
							this.selection.items.list(),
						); // Update the MBR to match items
						return false;
					}

					// If snapping is active, prevent resizing of the selection border
					this.mbr = this.alignmentHelper.combineMBRs(
						this.selection.items.list(),
					); // Ensure MBR matches items
				} else {
					this.snapCursorPos = null; // Reset snapping state
					const translation = handleMultipleItemsResize({
						board: this.board,
						resize,
						initMbr: mbr,
						isWidth,
						isHeight,
						isShiftPressed: this.isShiftPressed,
					});
					this.selection.transformMany(
						translation,
						this.beginTimeStamp,
					);

					if (Object.keys(translation).length > 10) {
						this.canvasDrawer.updateCanvasAndKeys(
							resize.mbr,
							translation,
							resize.matrix,
						);
						this.debounceUpd.setFalse();
						this.debounceUpd.setTimeoutUpdate(1000);
					}

					this.mbr = this.alignmentHelper.combineMBRs(
						this.selection.items.list(),
					); // Update the MBR to match items
				}
			}
		}

		const frames = this.board.items.getFramesEnclosedOrCrossed(
			mbr.left,
			mbr.top,
			mbr.right,
			mbr.bottom,
		);
		list.forEach(item => {
			if (item instanceof Frame) {
				const currMbr = item.getMbr();
				const itemsToCheck = this.board.items.getEnclosedOrCrossed(
					currMbr.left,
					currMbr.top,
					currMbr.right,
					currMbr.bottom,
				);
				itemsToCheck.forEach(currItem => {
					if (
						item.handleNesting(currItem) &&
						(currItem.parent === "Board" ||
							currItem.parent === item.getId())
					) {
						this.nestingHighlighter.add(item, currItem);
					} else {
						this.nestingHighlighter.remove(currItem);
					}
				});
			} else {
				frames.forEach(frame => {
					if (frame.handleNesting(item)) {
						this.nestingHighlighter.add(frame, item);
					} else {
						this.nestingHighlighter.remove(item);
					}
				});
			}
		});

		this.selection.off();
		this.selection.subject.publish(this.selection);

		return true;
	}

	render(context: DrawingContext): void {
		const mbr = this.mbr;
		const isLockedItems = this.selection.getIsLockedSelection();

		if (mbr) {
			mbr.strokeWidth = 1 / context.matrix.scaleX;

			const selectionColor = isLockedItems
				? conf.SELECTION_LOCKED_COLOR
				: conf.SELECTION_COLOR;
			mbr.borderColor = selectionColor;
			mbr.render(context);
		}

		this.alignmentHelper.renderSnapLines(
			context,
			this.snapLines,
			this.board.camera.getScale(),
		);

		if (!isLockedItems) {
			const anchors = this.calcAnchors();
			for (const anchor of anchors) {
				anchor.render(context);
			}
		}

		this.nestingHighlighter.render(context);
	}

	handleSelectionUpdate(_items: SelectionItems): void {
		// do nothing
	}

	calcAnchors(): Geometry[] {
		const mbr = this.mbr;
		const anchors: Geometry[] = [];
		if (mbr) {
			const { left, top, right, bottom } = mbr;
			const points = [
				new Point(left, top),
				new Point(right, top),
				new Point(left, bottom),
				new Point(right, bottom),
			];
			for (const point of points) {
				const circle = new Anchor(
					point.x,
					point.y,
					conf.SELECTION_ANCHOR_RADIUS,
					conf.SELECTION_COLOR,
					conf.SELECTION_ANCHOR_COLOR,
					conf.SELECTION_ANCHOR_WIDTH,
				);
				anchors.push(circle);
			}
		}
		return anchors;
	}
}
