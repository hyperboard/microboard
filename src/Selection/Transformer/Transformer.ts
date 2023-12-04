import { Tool } from "Board/Tools/Tool";
import { DrawingContext } from "Board/Items/DrawingContext";
import {Mbr, Point, Shape} from "Board/Items";
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

export class Transformer extends Tool {
	anchorType: AnchorType = "default";
	resizeType?: ResizeType;
	oppositePoint?: Point;
	mbr: Mbr | undefined;
	// original mbr when resize was triggered
	startMbr: Mbr | undefined;

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
		if (item && item.itemType === "RichText") {
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
		if (this.resizeType && mbr) {
			this.oppositePoint = getOppositePoint(this.resizeType, mbr);
			this.mbr = mbr;
			this.startMbr = mbr;
		}
		return this.resizeType !== undefined;
	}

	leftButtonUp(): boolean {
		this.updateAnchorType();
		const wasResising = this.resizeType !== undefined;
		this.resizeType = undefined;
		this.oppositePoint = undefined;
		this.mbr = undefined;
		return wasResising;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		this.updateAnchorType();
		if (!this.resizeType) {
			return false;
		}

		const mbr = this.mbr;
		const list = this.selection.items.list();

		if (!mbr || list.length === 0 || !this.oppositePoint) {
			console.log("no mbr");
			return false;
		}

		const isWidth =
			this.resizeType === "left" || this.resizeType === "right";
		const isHeight =
			this.resizeType === "top" || this.resizeType === "bottom";
		const isSingle = list.length === 1;
		const single = list[0];

		if (isSingle && single.itemType === "Shape") {
			this.mbr = single.doResize(this.resizeType, this.board.pointer.point, mbr, this.oppositePoint, this.startMbr).mbr;
		} else if (isSingle && single.itemType === "RichText") {
			const matrix = getProportionalResize(
				this.resizeType,
				this.board.pointer.point,
				mbr,
				this.oppositePoint,
			).matrix;

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
				);
				single.transformation.scaleBy(matrix.scaleX, matrix.scaleY);
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
			for (const item of list) {
				const itemMbr = item.getMbr();
				const deltaX = itemMbr.left - mbr.left;
				const translateX =
					deltaX * matrix.scaleX - deltaX + matrix.translateX;
				const deltaY = itemMbr.top - mbr.top;
				const translateY =
					deltaY * matrix.scaleY - deltaY + matrix.translateY;

				if (item.itemType === "RichText") {
					if (isWidth) {
						item.editor.setMaxWidth(
							(item.getWidth() /
								item.transformation.getScale().x) *
								matrix.scaleX,
						);
						item.transformation.translateBy(matrix.translateX, 0);
					} else if (isHeight) {
						item.transformation.translateBy(translateX, translateY);
					} else {
						item.transformation.translateBy(translateX, translateY);
						item.transformation.scaleBy(
							matrix.scaleX,
							matrix.scaleY,
						);
					}
				} else {
					item.transformation.translateBy(translateX, translateY);
					if(item.itemType != "Shape" || item.getShapeType() != "Sticker") {
						item.transformation.scaleBy(matrix.scaleX, matrix.scaleY);
					}
				}
			}
			this.mbr = resize.mbr;
		}

		this.selection.subject.publish(this.selection);

		return true;
	}

	render(context: DrawingContext): void {
		if (this.mbr) {
			this.mbr.strokeWidth = 1 / context.matrix.scaleX;
			this.mbr.borderColor = "rgba(0, 0, 255, 0.8";
			this.mbr.render(context);
		}

		const anchors = this.calcAnchors();
		for (const anchor of anchors) {
			anchor.render(context);
		}
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
					"rgba(0,0,255,0.8)",
					"rgba(255,255,255,0.8)",
					1,
				);
				anchors.push(circle);
			}
		}
		return anchors;
	}
}
