import { Board } from "Board";
import { Mbr, Point, Transformation } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { getOppositePoint } from "Board/Selection/Transformer/getOppositePoint";
import { getResize } from "Board/Selection/Transformer/getResizeMatrix";
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
	tempCanvas = document.createElement("canvas")!;
	tempCtx = this.tempCanvas.getContext("2d")!;

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
			1,
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
			const resize = getResize(
				this.resizeType,
				this.board.pointer.point,
				this.mbr,
				this.oppositePoint,
			);
			this.mbr = resize.mbr;
			this.mbr.strokeWidth = 0;
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
		if (
			!resizeType ||
			resizeType === "bottom" ||
			resizeType === "left" ||
			resizeType === "right" ||
			resizeType === "top"
		) {
			return;
		}

		switch (resizeType) {
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
		if (
			this.resizeType === "bottom" ||
			this.resizeType === "left" ||
			this.resizeType === "top" ||
			this.resizeType === "right"
		) {
			this.resizeType = null;
		}
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

	renderDecoration(
		context: DrawingContext,
		path: Path2D,
		translateX: number,
		translateY: number,
	) {
		const ctx = context.ctx;
		ctx.save();
		ctx.translate(translateX, translateY);
		ctx.stroke(path);
		ctx.restore();
	}

	render(context: DrawingContext): void {
		const cameraMbr = context.camera.getMbr();
		const ctx = context.ctx;
		this.tempCanvas.width = ctx.canvas.width;
		this.tempCanvas.height = ctx.canvas.height;

		const clearRect = {
			left: this.mbr.left,
			top: this.mbr.top,
			width: this.mbr.getWidth(),
			height: this.mbr.getHeight(),
		};
		// const imageData = ctx.getImageData(
		// 	clearRect.left,
		// 	clearRect.top,
		// 	clearRect.width,
		// 	clearRect.height,
		// );
		this.tempCtx.drawImage(ctx.canvas, 0, 0);

		this.tempCtx.fillStyle = BLUR_BACKGROUND_COLOR;
		this.tempCtx.fillRect(
			0,
			0,
			this.tempCanvas.width,
			this.tempCanvas.height,
		);
		this.tempCtx.filter = "blur(3px)";
		this.tempCtx.drawImage(this.tempCanvas, 0, 0);

		ctx.drawImage(
			this.tempCanvas,
			cameraMbr.left,
			cameraMbr.top,
			cameraMbr.getWidth(),
			cameraMbr.getHeight(),
		);

		ctx.clearRect(
			clearRect.left,
			clearRect.top,
			clearRect.width,
			clearRect.height,
		);

		this.board.items.getInView().forEach(item => {
			if (item.getMbr().isEnclosedOrCrossedBy(this.mbr)) {
				item.render(context);
			}
		});

		ctx.strokeStyle = "#2291FF";
		ctx.lineWidth = 6;
		this.renderDecoration(
			context,
			new Path2D("M70 2H22C10.9543 2 2 10.9543 2 22V70"),
			clearRect.left - 6,
			clearRect.top - 6,
		);
		this.renderDecoration(
			context,
			new Path2D("M70 70V22C70 10.9543 61.0457 2 50 2L2 2"),
			clearRect.left + clearRect.width - 66,
			clearRect.top - 6,
		);
		this.renderDecoration(
			context,
			new Path2D("M2 2L2 50C2 61.0457 10.9543 70 22 70H70"),
			clearRect.left - 6,
			clearRect.top + clearRect.height - 66,
		);
		this.renderDecoration(
			context,
			new Path2D("M2 70L50 70C61.0457 70 70 61.0457 70 50L70 2"),
			clearRect.left + clearRect.width - 66,
			clearRect.top + clearRect.height - 66,
		);
	}
}
