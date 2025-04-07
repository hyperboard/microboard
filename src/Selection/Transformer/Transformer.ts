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
import { Comment } from "Board/Items/Comment/Comment";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Geometry } from "Board/Items/Geometry";
import { Sticker } from "Board/Items/Sticker";
import { TransformManyItems } from "Board/Items/Transformation/TransformationOperations";
import { Selection } from "Board/Selection";
import { SelectionItems } from "Board/Selection/SelectionItems";
import { conf } from "Board/Settings";
import { createDebounceUpdater } from "Board/Tools/DebounceUpdater";
import { NestingHighlighter } from "Board/Tools/NestingHighlighter";
import AlignmentHelper from "Board/Tools/RelativeAlignment";
import { Tool } from "Board/Tools/Tool";
import { AnchorType, getAnchorFromResizeType } from "./AnchorType";
import { getOppositePoint } from "./getOppositePoint";
import { getProportionalResize, getResize } from "./getResizeMatrix";
import { getResizeType, ResizeType } from "./getResizeType";
import { getTextResizeType } from "./TextTransformer/getTextResizeType";

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
			const translation = this.handleMultipleItemsResize(
				resize,
				this.mbr,
				isWidth,
				isHeight,
			);
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
		let followingComments: Comment[] | undefined = this.board.items
			.getComments()
			.filter(comment => {
				return (
					comment.getItemToFollow() &&
					comment.getItemToFollow() === single?.getId()
				);
			});
		if (!followingComments.length) {
			followingComments = undefined;
		}

		if (single?.transformation.isLocked) {
			this.board.pointer.setCursor("default");
			return false;
		}

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

		if (
			single instanceof Shape ||
			single instanceof Sticker ||
			single instanceof Frame
		) {
			let translation: TransformManyItems | boolean = {};
			if (this.isShiftPressed && single.itemType !== "Sticker") {
				const { matrix, mbr: resizedMbr } = getProportionalResize(
					this.resizeType,
					this.board.pointer.point,
					mbr,
					this.oppositePoint,
				);
				this.mbr = resizedMbr;
				translation = this.handleMultipleItemsResize(
					{ matrix, mbr: resizedMbr },
					mbr,
					isWidth,
					isHeight,
				);
				this.selection.transformMany(translation, this.beginTimeStamp);
			} else {
				this.mbr = single.doResize(
					this.resizeType,
					this.board.pointer.point,
					mbr,
					this.oppositePoint,
					this.startMbr || new Mbr(),
					this.beginTimeStamp,
				).mbr;

				if (followingComments) {
					const { matrix, mbr: resizedMbr } =
						single instanceof Sticker
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
					translation = this.handleMultipleItemsResize(
						{ matrix, mbr: resizedMbr },
						mbr,
						isWidth,
						isHeight,
						followingComments,
					);
					this.selection.transformMany(
						translation,
						this.beginTimeStamp,
					);
				}
			}
		} else if (single instanceof RichText) {
			const isLongText = single.getTextString().length > 5000;
			if (!this.mbr) {
				return false;
			}

			const { matrix, mbr: resizedMbr } = getProportionalResize(
				this.resizeType,
				this.board.pointer.point,
				mbr,
				this.oppositePoint,
			);

			if (isWidth) {
				if (isLongText) {
					const isLeft = this.resizeType === "left";
					if (this.board.selection.shouldRenderItemsMbr) {
						this.board.selection.shouldRenderItemsMbr = false;
					}
					if (this.board.pointer.getCursor() !== "w-resize") {
						this.board.pointer.setCursor("w-resize");
					}
					if (isLeft) {
						if (
							this.board.pointer.point.x >=
							this.mbr.right - 100
						) {
							return false;
						}
						this.mbr.left = this.board.pointer.point.x;
					} else {
						if (this.board.pointer.point.x <= this.mbr.left + 100) {
							return false;
						}
						this.mbr.right = this.board.pointer.point.x;
					}
					const newWidth = this.mbr.getWidth();
					this.onPointerUpCb = () => {
						this.board.pointer.setCursor("default");
						this.board.selection.shouldRenderItemsMbr = true;
						if (isLeft) {
							single.transformation.translateBy(
								single.getWidth() - newWidth,
								0,
							);
						}
						single.editor.setMaxWidth(newWidth);
					};
					return true;
				} else {
					single.editor.setMaxWidth(
						resizedMbr.getWidth() / single.getScale(),
					);
					single.transformation.translateBy(matrix.translateX, 0);
					matrix.translateY = 0;
					matrix.scaleY = 1;
				}
			} else {
				if (isLongText) {
					if (this.board.selection.shouldRenderItemsMbr) {
						this.board.selection.shouldRenderItemsMbr = false;
					}
					switch (this.resizeType) {
						case "leftTop":
							if (
								this.board.pointer.getCursor() !== "nwse-resize"
							) {
								this.board.pointer.setCursor("nwse-resize");
							}
							if (
								this.board.pointer.point.x >=
									this.mbr.right - 100 ||
								this.board.pointer.point.y >=
									this.mbr.bottom - 100
							) {
								return false;
							}
							break;

						case "rightTop":
							if (
								this.board.pointer.getCursor() !== "nesw-resize"
							) {
								this.board.pointer.setCursor("nesw-resize");
							}
							if (
								this.board.pointer.point.x <=
									this.mbr.left + 100 ||
								this.board.pointer.point.y >=
									this.mbr.bottom - 100
							) {
								return false;
							}
							break;

						case "leftBottom":
							if (
								this.board.pointer.getCursor() !== "nesw-resize"
							) {
								this.board.pointer.setCursor("nesw-resize");
							}
							if (
								this.board.pointer.point.x >=
									this.mbr.right - 100 ||
								this.board.pointer.point.y <= this.mbr.top + 100
							) {
								return false;
							}
							break;

						case "rightBottom":
							if (
								this.board.pointer.getCursor() !== "nwse-resize"
							) {
								this.board.pointer.setCursor("nwse-resize");
							}
							if (
								this.board.pointer.point.x <=
									this.mbr.left + 100 ||
								this.board.pointer.point.y <= this.mbr.top + 100
							) {
								return false;
							}
							break;

						default:
							break;
					}
					this.mbr = resizedMbr;
					const mbrWidth = this.mbr.getWidth();
					const mbrHeight = this.mbr.getHeight();
					const { left, top } = this.mbr;
					this.onPointerUpCb = () => {
						this.board.pointer.setCursor("default");
						this.board.selection.shouldRenderItemsMbr = true;
						const scaleX = mbrWidth / single.getWidth();
						const scaleY = mbrHeight / single.getHeight();
						const translateX = left - single.left;
						const translateY = top - single.top;
						single.transformation.scaleByTranslateBy(
							{ x: scaleX, y: scaleY },
							{ x: translateX, y: translateY },
							this.beginTimeStamp,
						);
					};
					return true;
				} else {
					single.transformation.scaleByTranslateBy(
						{ x: matrix.scaleX, y: matrix.scaleY },
						{ x: matrix.translateX, y: matrix.translateY },
						this.beginTimeStamp,
					);
				}
			}
			if (followingComments) {
				const translation = this.handleMultipleItemsResize(
					{ matrix, mbr: resizedMbr },
					mbr,
					isWidth,
					isHeight,
					followingComments,
				);
				this.selection.transformMany(translation, this.beginTimeStamp);
			}
			this.mbr = single.getMbr();
		} else if (single instanceof AINode) {
			const { matrix, mbr: resizedMbr } = getProportionalResize(
				this.resizeType,
				this.board.pointer.point,
				mbr,
				this.oppositePoint,
			);

			if (isWidth) {
				single.text.editor.setMaxWidth(
					resizedMbr.getWidth() / single.text.getScale(),
				);
				single.text.transformation.translateBy(matrix.translateX, 0);
				matrix.translateY = 0;
				matrix.scaleY = 1;
			} else {
				single.text.transformation.scaleByTranslateBy(
					{ x: matrix.scaleX, y: matrix.scaleY },
					{ x: matrix.translateX, y: matrix.translateY },
					this.beginTimeStamp,
				);
			}
			if (followingComments) {
				const translation = this.handleMultipleItemsResize(
					{ matrix, mbr: resizedMbr },
					mbr,
					isWidth,
					isHeight,
					followingComments,
				);
				this.selection.transformMany(translation, this.beginTimeStamp);
			}
			this.mbr = single.getMbr();
		} else {
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
			if (
				this.canvasDrawer.getLastCreatedCanvas() &&
				this.debounceUpd.shouldUpd()
			) {
				const translation = this.handleMultipleItemsResize(
					resize,
					mbr,
					isWidth,
					isHeight,
				);
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
						const translation = this.handleMultipleItemsResize(
							resize,
							mbr,
							isWidth,
							isHeight,
						);
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
					const translation = this.handleMultipleItemsResize(
						resize,
						mbr,
						isWidth,
						isHeight,
					);
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

	handleMultipleItemsResize(
		resize: { matrix: Matrix; mbr: Mbr },
		initMbr: Mbr,
		isWidth: boolean,
		isHeight: boolean,
		itemsToResize?: Item[],
	): TransformManyItems {
		const { matrix, mbr } = resize;
		const translation: TransformManyItems = {};
		const items = itemsToResize
			? itemsToResize
			: this.selection.items.list();
		this.board.items.getComments().forEach(comment => {
			if (
				items.some(item => item.getId() === comment.getItemToFollow())
			) {
				items.push(comment);
			}
		});

		for (const item of items) {
			let itemX = item.getMbr().left;
			let itemY = item.getMbr().top;

			if (item.itemType === "Drawing") {
				itemX = item.transformation.matrix.translateX;
				itemY = item.transformation.matrix.translateY;
			}

			const deltaX = itemX - initMbr.left;
			const translateX =
				deltaX * matrix.scaleX - deltaX + matrix.translateX;
			const deltaY = itemY - initMbr.top;
			const translateY =
				deltaY * matrix.scaleY - deltaY + matrix.translateY;

			if (item instanceof RichText) {
				if (isWidth) {
					item.editor.setMaxWidth(
						(item.getWidth() / item.transformation.getScale().x) *
							matrix.scaleX,
					);
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: matrix.translateX, y: 0 },
						scale: { x: matrix.scaleX, y: matrix.scaleX },
					};
				} else if (isHeight) {
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: translateX, y: translateY },
						scale: { x: 1, y: 1 },
					};
				} else {
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: translateX, y: translateY },
						scale: { x: matrix.scaleX, y: matrix.scaleX },
					};
				}
			} else if (item instanceof AINode) {
				if (isWidth) {
					item.text.editor.setMaxWidth(
						(item.text.getWidth() /
							item.transformation.getScale().x) *
							matrix.scaleX,
					);
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: matrix.translateX, y: 0 },
						scale: { x: matrix.scaleX, y: matrix.scaleX },
					};
				} else if (isHeight) {
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: translateX, y: translateY },
						scale: { x: 1, y: 1 },
					};
				} else {
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: translateX, y: translateY },
						scale: { x: matrix.scaleX, y: matrix.scaleX },
					};
				}
			} else {
				if (item instanceof Sticker && (isWidth || isHeight)) {
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: translateX, y: translateY },
						scale: { x: 1, y: 1 },
					};
				} else {
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: translateX, y: translateY },
						scale: { x: matrix.scaleX, y: matrix.scaleY },
					};

					if (
						item.itemType === "Frame" &&
						item.getCanChangeRatio() &&
						!this.isShiftPressed &&
						item.getFrameType() !== "Custom"
					) {
						item.setFrameType("Custom");
					}
				}
			}
		}

		return translation;
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
