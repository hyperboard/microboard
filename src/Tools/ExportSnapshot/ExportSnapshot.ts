import { Board } from "Board";
import { Mbr, Point, Transformation } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { getOppositePoint } from "Board/Selection/Transformer/getOppositePoint";
import { getProportionalResize } from "Board/Selection/Transformer/getResizeMatrix";
import {
	getResizeType,
	ResizeType,
} from "Board/Selection/Transformer/getResizeType";
import { Tool } from "Board/Tools/Tool";
import {
	BLUR_BACKGROUND_COLOR,
	SELECTION_BOX_HEIGHT,
	SELECTION_BOX_WIDTH,
} from "View/Tools/ExportBoard";
import { exportBoardSnapshot } from "./exportBoardSnapshot";
import { Quality } from "./types";

export class ExportSnapshot extends Tool {
	mbr: Mbr;
	transformation = new Transformation();
	isDown = false;
	isDragging = false;
	resizeType: null | ResizeType = null;
	oppositePoint: null | Point = null;

	constructor(private board: Board) {
		super();
		const cameraCenter = this.board.camera.getMbr().getCenter();
		this.mbr = new Mbr(
			cameraCenter.x - SELECTION_BOX_WIDTH / 2,
			cameraCenter.y - SELECTION_BOX_HEIGHT / 2,
			cameraCenter.x + SELECTION_BOX_WIDTH / 2,
			cameraCenter.y + SELECTION_BOX_HEIGHT / 2,
			"transparent",
			"transparent",
			0,
		);
		this.board.selection.disable();
	}

	rectMoveTo(x: number, y: number): void {
		this.transformation.translateTo(x, y);
		this.mbr.transform(this.transformation.matrix);
		this.board.tools.publish();
	}

	resize(): void {
		if (this.resizeType && this.mbr && this.oppositePoint) {
			const resize = getProportionalResize(
				this.resizeType,
				this.board.pointer.point,
				this.mbr,
				this.oppositePoint,
			);
			this.mbr = resize.mbr;
			this.board.tools.publish();
		}
	}

	updateCursor(): void {
		if (!this.mbr) {
			return;
		}
		const { pointer } = this.board;
		if (this.mbr?.isUnderPoint(pointer.point)) {
			pointer.setCursor("default");
		}
		if (!this.mbr?.isUnderPoint(pointer.point)) {
			if (this.isDown) {
				pointer.setCursor("grabbing");
			}
			pointer.setCursor("grab");
		}

		const resizeType: ResizeType | undefined = getResizeType(
			this.board.pointer.point,
			this.board.camera.getScale(),
			this.mbr,
		);
		if (!resizeType) {
			return;
		}

		switch (resizeType) {
			case "bottom":
				pointer.setCursor("s-resize");
				break;
			case "left":
				pointer.setCursor("w-resize");
				break;
			case "right":
				pointer.setCursor("e-resize");
				break;
			case "top":
				pointer.setCursor("n-resize");
				break;
			case "leftTop":
				pointer.setCursor("nw-resize");
				break;
			case "rightTop":
				pointer.setCursor("ne-resize");
				break;
			case "leftBottom":
				pointer.setCursor("sw-resize");
				break;
			case "rightBottom":
				pointer.setCursor("se-resize");
				break;
		}
	}

	pointerMoveBy(x: number, y: number): boolean {
		this.updateCursor();
		if (this.isDown) {
			if (this.resizeType && this.mbr) {
				this.resize();
				return true;
			}
			if (this.isDragging && !this.resizeType) {
				this.rectMoveTo(x, y);
				return true;
			}
			console.log(this.isDragging, this.resizeType, this.oppositePoint);
			if (!this.isDragging && !this.resizeType && !this.oppositePoint) {
				this.board.camera.translateBy(x, y);
				return true;
			}
		}
		return false;
	}

	leftButtonDown(): boolean {
		this.resizeType =
			getResizeType(
				this.board.pointer.point,
				this.board.camera.getScale(),
				this.mbr,
			) ?? null;
		this.isDown = true;
		if (
			this.mbr?.isUnderPoint(this.board.pointer.point) &&
			!this.resizeType
		) {
			this.isDragging = true;
		}
		if (
			this.mbr?.isUnderPoint(this.board.pointer.point) &&
			this.resizeType &&
			this.oppositePoint
		) {
			this.isDragging = false;
		}
		if (this.resizeType && this.mbr) {
			this.oppositePoint = getOppositePoint(this.resizeType, this.mbr);
		}
		return true;
	}

	leftButtonUp(): boolean {
		this.isDown = false;
		this.isDragging = false;
		this.resizeType = null;
		this.oppositePoint = null;
		return true;
	}

	takeSnapshot(): void {
		if (!this.mbr) {
			return;
		}
		exportBoardSnapshot(this.board, Quality.HIGH, this.mbr);
		this.board.selection.on();
	}

	renderBlur(context: DrawingContext) {
		const cameraMbr = this.board.camera.getMbr();
		const leftMbr = new Mbr(
			cameraMbr.left,
			this.mbr.top,
			this.mbr.left,
			this.mbr.bottom,
			"transparent",
			BLUR_BACKGROUND_COLOR,
			0,
		);
		const topMbr = new Mbr(
			cameraMbr.left,
			cameraMbr.top,
			cameraMbr.right,
			this.mbr.top,
			"transparent",
			BLUR_BACKGROUND_COLOR,
			0,
		);
		const bottomMbr = new Mbr(
			cameraMbr.left,
			this.mbr.bottom,
			cameraMbr.right,
			cameraMbr.bottom,
			"transparent",
			BLUR_BACKGROUND_COLOR,
			0,
		);
		const rightMbr = new Mbr(
			this.mbr.right,
			this.mbr.top,
			cameraMbr.right,
			this.mbr.bottom,
			"transparent",
			BLUR_BACKGROUND_COLOR,
			0,
		);

		leftMbr.render(context);
		topMbr.render(context);
		bottomMbr.render(context);
		rightMbr.render(context);
	}

	render(context: DrawingContext): void {
		this.renderBlur(context);
		this.mbr.render(context);
	}
}
