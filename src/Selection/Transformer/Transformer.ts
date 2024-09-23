import { Tool } from "Board/Tools/Tool";
import { DrawingContext } from "Board/Items/DrawingContext";
import {
	Frame,
	Mbr,
	Point,
	Shape,
	TransformationOperation,
	RichText,
	Matrix,
	Connector,
} from "Board/Items";
import { SelectionItems } from "Board/Selection/SelectionItems";
import { Board } from "Board";
import { Selection } from "Board/Selection";
import { getResizeType, ResizeType } from "./getResizeType";
import { AnchorType, getAnchorFromResizeType } from "./AnchorType";
import { getProportionalResize } from "./getResizeMatrix";
import { getOppositePoint } from "./getOppositePoint";
import { getTextResizeType } from "./TextTransformer/getTextResizeType";
import { Geometry } from "Board/Items/Geometry";
import { Anchor } from "Board/Items/Anchor";
import {
	SELECTION_ANCHOR_COLOR,
	SELECTION_ANCHOR_RADIUS,
	SELECTION_ANCHOR_WIDTH,
	SELECTION_COLOR,
} from "View/Tools/Selection";
import { Sticker } from "Board/Items/Sticker";
import { NestingHighlighter } from "Board/Tools/NestingHighlighter";
import { TransformManyItems } from "Board/Items/Transformation/TransformationOperations";
import createCanvasDrawer from "Board/drawMbrOnCanvas";
import { createDebounceUpdater } from "Board/Tools/DebounceUpdater";

export class Transformer extends Tool {
	anchorType: AnchorType = "default";
	resizeType?: ResizeType;
	oppositePoint?: Point;
	mbr: Mbr | undefined;
	// original mbr when resize was triggered
	startMbr: Mbr | undefined;
	clickedOn?: ResizeType;
	private toDrawBorders = new NestingHighlighter();
	beginTimeStamp = Date.now();
	canvasDrawer = createCanvasDrawer(this.board);
	debounceUpd = createDebounceUpdater();

	constructor(private board: Board, private selection: Selection) {
		super();

		selection.subject.subscribe(() => {
			if (!this.resizeType) {
				this.mbr = this.selection.getMbr();
			}
		});
	}

	updateAnchorType(): void {
		const pointer = this.board.pointer;
		const resizeType = this.getResizeType();
		const anchorType = getAnchorFromResizeType(resizeType);
		pointer.setCursor(anchorType);
		this.anchorType = anchorType;
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
		this.resizeType = undefined;
		this.clickedOn = undefined;
		this.oppositePoint = undefined;
		this.mbr = undefined;
		this.toDrawBorders.clear();
		this.beginTimeStamp = Date.now();
		this.canvasDrawer.clearCanvasAndKeys();
		this.board.selection.subject.publish(this.board.selection);
		return wasResising;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		this.updateAnchorType();
		if (!this.resizeType) {
			return false;
		}

		// const mbr = this.mbr;
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

		if (
			single instanceof Shape ||
			single instanceof Sticker ||
			single instanceof Frame
		) {
			this.mbr = single.doResize(
				this.resizeType,
				this.board.pointer.point,
				mbr,
				this.oppositePoint,
				this.startMbr || new Mbr(),
				this.beginTimeStamp,
			).mbr;
		} else if (single instanceof RichText) {
			const { matrix, mbr: resizedMbr } = getProportionalResize(
				this.resizeType,
				this.board.pointer.point,
				mbr,
				this.oppositePoint,
			);

			if (isWidth) {
				single.editor.setMaxWidth(
					resizedMbr.getWidth() / single.getScale(),
				);
				single.transformation.translateBy(matrix.translateX, 0);
			} else {
				single.transformation.scaleByTranslateBy(
					{ x: matrix.scaleX, y: matrix.scaleY },
					{ x: matrix.translateX, y: matrix.translateY },
					this.beginTimeStamp,
				);
			}
			this.mbr = single.getMbr();
		} else {
			const items = this.selection.items.list();
			const containsStickerOrText = items.some(
				item =>
					item.itemType === "Sticker" || item.itemType === "RichText",
			);
			if (containsStickerOrText && (isWidth || isHeight)) {
				return false;
			}
			const resize = getProportionalResize(
				this.resizeType,
				this.board.pointer.point,
				mbr,
				this.oppositePoint,
			);
			if (
				this.canvasDrawer.getLastCreatedCanvas() &&
				!this.debounceUpd.shouldUpd() &&
				JSON.stringify(
					this.canvasDrawer.getLastTranslationKeys()?.sort(),
				) ===
					JSON.stringify(
						this.selection
							.list()
							.map(item => item.getId())
							.sort(),
					)
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
				const translation = this.handleMultipleItemsResize(
					resize,
					mbr,
					isWidth,
					isHeight,
				);
				this.selection.transformMany(translation, this.beginTimeStamp);
				if (Object.keys(translation).length > 50) {
					this.canvasDrawer.updateCanvasAndKeys(
						resize.mbr,
						translation,
						resize.matrix,
					);
					this.debounceUpd.setFalse();
					this.debounceUpd.setTimeoutUpdate(1000);
				}
			}
			this.mbr = resize.mbr;
		}

		const frames = this.board.items
			.getEnclosedOrCrossed(mbr.left, mbr.top, mbr.right, mbr.bottom)
			.filter(item => item instanceof Frame);
		list.forEach(item => {
			if (item instanceof Frame) {
				const itemsToCheck = this.board.items
					.getEnclosedOrCrossed(
						item.getMbr().left,
						item.getMbr().top,
						item.getMbr().right,
						item.getMbr().bottom,
					)
					.filter(
						currItem =>
							currItem !== item &&
							!(currItem instanceof Frame) &&
							(currItem.parent === "Board" ||
								currItem.parent === item.getId()),
					);
				itemsToCheck.forEach(currItem => {
					if (item.handleNesting(currItem)) {
						this.toDrawBorders.add([item, currItem]);
					} else {
						if (
							this.toDrawBorders.listAll().includes(item) &&
							this.toDrawBorders.listAll().includes(currItem)
						) {
							this.toDrawBorders.remove([item, currItem]);
						}
					}
				});
			} else {
				frames.forEach(frame => {
					if (!frame.handleNesting(item, { onlyForOut: true })) {
						if (
							this.toDrawBorders.listAll().includes(frame) &&
							this.toDrawBorders.listAll().includes(item)
						) {
							this.toDrawBorders.remove([frame, item]);
						}
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
		if (mbr) {
			mbr.strokeWidth = 1 / context.matrix.scaleX;
			mbr.borderColor = SELECTION_COLOR;
			mbr.render(context);
		}

		const anchors = this.calcAnchors();
		for (const anchor of anchors) {
			anchor.render(context);
		}

		this.toDrawBorders.render(context);
	}

	handleSelectionUpdate(_items: SelectionItems): void {
		// do nothing
	}

	handleMultipleItemsResize(
		resize: { matrix: Matrix; mbr: Mbr },
		initMbr: Mbr,
		isWidth: boolean,
		isHeight: boolean,
	): TransformManyItems {
		const { matrix } = resize;
		const translation: TransformManyItems = {};
		const items = this.selection.items.list();

		for (const item of items) {
			const itemMbr = item.getMbr();
			const deltaX = itemMbr.left - initMbr.left;
			const translateX =
				deltaX * matrix.scaleX - deltaX + matrix.translateX;
			const deltaY = itemMbr.top - initMbr.top;
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
						scale: { x: 1, y: 1 },
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
			} else if (item instanceof Frame) {
				if (!item.getCanChangeRatio()) {
					if (
						this.clickedOn === "leftBottom" ||
						this.clickedOn === "leftTop" ||
						this.clickedOn === "rightBottom" ||
						this.clickedOn === "rightTop"
					) {
						translation[item.getId()] = {
							class: "Transformation",
							method: "scaleByTranslateBy",
							item: [item.getId()],
							translate: { x: translateX, y: translateY },
							scale: { x: matrix.scaleX, y: matrix.scaleY },
						};
					}
				} else {
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: translateX, y: translateY },
						scale: { x: matrix.scaleX, y: matrix.scaleY },
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
					SELECTION_ANCHOR_RADIUS,
					SELECTION_COLOR,
					SELECTION_ANCHOR_COLOR,
					SELECTION_ANCHOR_WIDTH,
				);
				anchors.push(circle);
			}
		}
		return anchors;
	}
}
