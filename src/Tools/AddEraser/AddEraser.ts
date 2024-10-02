import { Board } from "Board/Board";
import { Point } from "Board/Items";
import { Drawing } from "Board/Items/Drawing";
import { DrawingContext } from "Board/Items/DrawingContext";
import {
	DEFAULT_ERASER_COLOR,
	MAX_ERASER_LINE_LENGTH,
	RENDER_POINTER_CIRCLE,
} from "View/Tools/AddDrawing";
import {
	DRAWING_POINTER_CIRCLE_COLOR,
	DRAWING_STROKE_STYLE,
} from "View/Tools/AddDrawing";
import { BoardTool } from "../BoardTool";
import { Eraser } from "../../Items/Eraser";
import { BorderStyle } from "../../Items/Path";

export class AddEraser extends BoardTool {
	isDown = false;
	strokeWidth = 12;
	strokeColor = DEFAULT_ERASER_COLOR;
	strokeStyle: BorderStyle = DRAWING_STROKE_STYLE;
	eraser: Eraser;
	drawing = new Drawing([]);
	maxPointsInLine = MAX_ERASER_LINE_LENGTH;

	constructor(board: Board) {
		super(board);
		this.setCursor();
		this.eraser = new Eraser(board);
	}

	renderPointerCircle(point: Point, context: DrawingContext) {
		const ctx = context.ctx;
		ctx.beginPath();
		ctx.arc(point.x, point.y, this.strokeWidth / 2, 0, 2 * Math.PI, false);
		ctx.lineWidth = 1;
		ctx.strokeStyle = DRAWING_POINTER_CIRCLE_COLOR;
		ctx.stroke();
	}

	setCursor(): void {
		this.board.pointer.setCursor("pen");
	}

	leftButtonDown(): boolean {
		this.isDown = true;
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.isDown) {
			const pointer = this.board.pointer.point.copy();
			const points = this.drawing.points;
			if (points.length > this.maxPointsInLine) {
				points.splice(0, points.length - this.maxPointsInLine);
			}
			this.drawing.addPoint(pointer);
			setTimeout(() => {
				if (this && this.drawing.points.length > 1) {
					this.drawing.points.shift();
				}
			}, 200);
			this.eraser.removeUnderPointOrLine(
				this.strokeWidth / 2,
				this.drawing.points[0],
				this.drawing.getLines(),
			);
		}
		this.board.tools.publish();
		return true;
	}

	leftButtonUp(): boolean {
		this.isDown = false;
		this.drawing = new Drawing([]);
		this.board.selection.removeAll();
		this.board.tools.publish();
		return true;
	}

	rightButtonDown(): boolean {
		return true;
	}

	render(context: DrawingContext): void {
		const drawing = this.drawing;
		drawing.setStrokeColor(this.strokeColor);
		drawing.setStrokeWidth(this.strokeWidth);
		drawing.setBorderStyle(this.strokeStyle);
		drawing.render(context);
		if (RENDER_POINTER_CIRCLE) {
			this.renderPointerCircle(this.board.pointer.point, context);
		}
	}
}
