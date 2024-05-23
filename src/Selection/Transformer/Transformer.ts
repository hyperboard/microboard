import { Tool } from "Board/Tools/Tool";
import { DrawingContext } from "Board/Items/DrawingContext";
import {
	Frame,
	Mbr,
	Point,
	Shape,
	TransformationOperation,
	RichText,
} from "Board/Items";
import { SelectionItems } from "Board/Selection/SelectionItems";
import { Board } from "Board";
import { Selection } from "Board/Selection";
import { getResizeType, ResizeType } from "./getResizeType";
import { AnchorType, getAnchorFromResizeType } from "./AnchorType";
import { getProportionalResize, getResize } from "./getResizeMatrix";
import { getOppositePoint } from "./getOppositePoint";
import { getTextResizeType } from "./TextTransformer/getTextResizeType";
import { Geometry } from "Board/Items/Geometry";
import { Anchor } from "Board/Items/Anchor";
import { SELECTION_ANCHOR_COLOR, SELECTION_COLOR } from "View/Tools/Selection";
import { Sticker } from "Board/Items/Sticker";
import { NestingHighlighter } from "Board/Tools/NestingHighlighter";
import { timeStamp } from "console";

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
		this.updateAnchorType();
		const wasResising = this.resizeType !== undefined;
		this.resizeType = undefined;
		this.clickedOn = undefined;
		this.oppositePoint = undefined;
		this.mbr = undefined;
		this.toDrawBorders.clear();
		this.beginTimeStamp = Date.now();
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
				this.startMbr,
				this.beginTimeStamp,
			).mbr;
		} else if (single instanceof RichText) {
			const matrix = getProportionalResize(
				this.resizeType,
				this.board.pointer.point,
				mbr,
				this.oppositePoint,
			).matrix;

			// TODO fix RichText transformation
			if (isWidth) {
				single.editor.setMaxWidth(
					(single.getWidth() / single.transformation.getScale().x) *
						matrix.scaleX,
				);
				single.transformation.translateBy(matrix.translateX, 0);
			} else {
				single.transformation.translateBy(
					matrix.translateX,
					matrix.translateY,
					this.beginTimeStamp,
				);
				single.transformation.scaleBy(
					matrix.scaleX,
					matrix.scaleY,
					this.beginTimeStamp,
				);
				// single.transformation.translateByScaleBy(
				// 	{ x: matrix.translateX, y: matrix.translateY },
				// 	{ x: matrix.scaleX, y: matrix.scaleY },
				// 	this.beginTimeStamp,
				// );
			}
			this.mbr = single.getMbr();
		} else {
			const resize = getProportionalResize(
				this.resizeType,
				this.board.pointer.point,
				mbr,
				this.oppositePoint,
			);
			const matrix = resize.matrix;
			const translation: { [key: string]: TransformationOperation } = {};
			for (const item of list) {
				const itemMbr = item.getMbr();
				const deltaX = itemMbr.left - mbr.left;
				const translateX =
					deltaX * matrix.scaleX - deltaX + matrix.translateX;
				const deltaY = itemMbr.top - mbr.top;
				const translateY =
					deltaY * matrix.scaleY - deltaY + matrix.translateY;

				if (item instanceof RichText) {
					if (isWidth) {
						item.editor.setMaxWidth(
							(item.getWidth() /
								item.transformation.getScale().x) *
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
						// TODO fix RichText transformation
						item.transformation.translateBy(
							matrix.translateX,
							matrix.translateY,
							this.beginTimeStamp,
						);
						item.transformation.scaleBy(
							matrix.scaleX,
							matrix.scaleY,
							this.beginTimeStamp,
						);
						// translation[item.getId()] = {
						// 	class: "Transformation",
						// 	method: "scaleByTranslateBy",
						// 	item: [item.getId()],
						// 	translate: { x: translateX, y: translateY },
						// 	scale: { x: matrix.scaleX, y: matrix.scaleY },
						// };
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
					translation[item.getId()] = {
						class: "Transformation",
						method: "scaleByTranslateBy",
						item: [item.getId()],
						translate: { x: translateX, y: translateY },
						scale:
							item instanceof Sticker
								? { x: 1, y: 1 }
								: { x: matrix.scaleX, y: matrix.scaleY },
					};
				}
			}
			this.selection.tranformMany(translation, this.beginTimeStamp);

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
					5,
					SELECTION_COLOR,
					SELECTION_ANCHOR_COLOR,
					1,
				);
				anchors.push(circle);
			}
		}
		return anchors;
	}
}
