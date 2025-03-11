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
import { SETTINGS } from "Board/Settings";
import { exportBoardSnapshot, SnapshotInfo } from "./exportBoardSnapshot";
import { getDecorationResizeType } from "./getDecorationResizeType";

const TOLERANCE = 30;

export class ExportSnapshot extends Tool {
	mbr: Mbr;
	transformation = new Transformation();
	isDown = false;
	isDragging = false;
	resizeType: null | ResizeType = null;
	oppositePoint: null | Point = null;
	tempCanvas = document.getElementById("ExportLayer") as HTMLCanvasElement;
	tempCtx = this.tempCanvas.getContext("2d")!;
	tempDrawingContext: DrawingContext;

	constructor(private board: Board) {
		super();
		const cameraCenter = this.board.camera.getMbr().getCenter();
		this.mbr = new Mbr(
			cameraCenter.x - SETTINGS.EXPORT_SELECTION_BOX_WIDTH / 2,
			cameraCenter.y - SETTINGS.EXPORT_SELECTION_BOX_HEIGHT / 2,
			cameraCenter.x + SETTINGS.EXPORT_SELECTION_BOX_WIDTH / 2,
			cameraCenter.y + SETTINGS.EXPORT_SELECTION_BOX_HEIGHT / 2,
			"transparent",
			"transparent",
			1,
		);
		this.board.selection.disable();
		this.tempDrawingContext = new DrawingContext(
			board.camera,
			this.tempCtx,
		);
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
			if (resize.mbr.getWidth() > SETTINGS.EXPORT_MIN_WIDTH) {
				this.mbr.left = resize.mbr.left;
				this.mbr.right = resize.mbr.right;
			}
			if (resize.mbr.getHeight() > SETTINGS.EXPORT_MIN_HEIGHT) {
				this.mbr.top = resize.mbr.top;
				this.mbr.bottom = resize.mbr.bottom;
			}
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
			pointer.setCursor("pointer");
		}
		if (!this.mbr?.isUnderPoint(pointer.point)) {
			if (this.isDown) {
				pointer.setCursor("grabbing");
			}
			pointer.setCursor("grab");
		}

		const resizeType: ResizeType | undefined =
			getDecorationResizeType(
				this.board.pointer.point,
				this.mbr,
				TOLERANCE, // Increase this value to make the resize area larger
			) ??
			getResizeType(
				this.board.pointer.point,
				this.board.camera.getScale(),
				this.mbr,
				TOLERANCE, // Increase this value to make the resize area larger
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
			getDecorationResizeType(
				this.board.pointer.point,
				this.mbr,
				20, // Increase this value to make the resize area larger
			) ??
			getResizeType(
				this.board.pointer.point,
				this.board.camera.getScale(),
				this.mbr,
				20, // Increase this value to make the resize area larger
			) ??
			null;

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

	async takeSnapshot(): Promise<SnapshotInfo> {
		if (!this.mbr) {
			throw new Error("No selection");
		}
		const res = await exportBoardSnapshot({
			board: this.board,
			bgColor: SETTINGS.CANVAS_BG_COLOR,
			selection: this.mbr,
			upscaleTo: 4000,
			nameToExport: this.board.getName(),
		});
		this.board.selection.on();
		return res;
	}

	renderDecoration(
		context: DrawingContext,
		path: Path2D,
		translateX: number,
		translateY: number,
		color: string,
		lineWidth: number,
	) {
		const ctx = context.ctx;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;
		ctx.translate(translateX, translateY);
		ctx.stroke(path);
		ctx.restore();
	}

	onCancel() {
		this.tempDrawingContext.clear();
	}

	render(context: DrawingContext): void {
		const cameraMbr = context.camera.getMbr();
		this.tempDrawingContext.setCamera(this.board.camera);
		this.tempDrawingContext.clear();
		cameraMbr.backgroundColor = SETTINGS.EXPORT_BLUR_BACKGROUND_COLOR;
		cameraMbr.strokeWidth = 0;
		cameraMbr.render(this.tempDrawingContext);

		// this.tempCtx.filter = "blur(15px)";
		// this.tempCtx.drawImage(this.tempCanvas, 0, 0);
		// this.tempCanvas.style.backdropFilter = "blur(5px)";

		this.tempCtx.clearRect(
			this.mbr.left,
			this.mbr.top,
			this.mbr.getWidth(),
			this.mbr.getHeight(),
		);

		if (SETTINGS.EXPORT_FRAME_DECORATIONS) {
			const topLeft = SETTINGS.EXPORT_FRAME_DECORATIONS["top-left"];
			this.renderDecoration(
				this.tempDrawingContext,
				topLeft.path,
				this.mbr.left + (topLeft.offsetX ?? 0),
				this.mbr.top + (topLeft.offsetY ?? 0),
				topLeft.color,
				topLeft.lineWidth,
			);
			const topRight = SETTINGS.EXPORT_FRAME_DECORATIONS["top-right"];
			this.renderDecoration(
				this.tempDrawingContext,
				topRight.path,
				this.mbr.right + (topRight.offsetX ?? 0),
				this.mbr.top + (topRight.offsetY ?? 0),
				topRight.color,
				topRight.lineWidth,
			);
			const bottomLeft = SETTINGS.EXPORT_FRAME_DECORATIONS["bottom-left"];
			this.renderDecoration(
				this.tempDrawingContext,
				bottomLeft.path,
				this.mbr.left + (bottomLeft.offsetX ?? 0),
				this.mbr.bottom + (bottomLeft.offsetY ?? 0),
				bottomLeft.color,
				bottomLeft.lineWidth,
			);
			const bottomRight =
				SETTINGS.EXPORT_FRAME_DECORATIONS["bottom-right"];
			this.renderDecoration(
				this.tempDrawingContext,
				bottomRight.path,
				this.mbr.left + this.mbr.getWidth() - bottomRight.width,
				this.mbr.top + this.mbr.getHeight() - bottomRight.width,
				bottomRight.color,
				bottomRight.lineWidth,
			);
		}
	}
}
