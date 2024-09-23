import { Board } from "Board/Board";
import { Point } from "Board/Items";
import { Drawing } from "Board/Items/Drawing";
import { DrawingContext } from "Board/Items/DrawingContext";
import { BorderStyle } from "Board/Items/Path";
import {
	DEFAULT_PEN_COLOR,
	DRAWING_SETTINGS_KEY,
	RENDER_POINTER_CIRCLE,
} from "View/Tools/AddDrawing";
import {
	DRAWING_POINTER_CIRCLE_COLOR,
	DRAWING_STROKE_STYLE,
	INITIAL_DRAWING_STROKE_WIDTH,
} from "View/Tools/AddDrawing";
import { BoardTool } from "../BoardTool";

export class AddDrawing extends BoardTool {
	drawing = new Drawing([]);
	isDown = false;
	strokeWidth = INITIAL_DRAWING_STROKE_WIDTH;
	strokeColor = DEFAULT_PEN_COLOR;
	strokeStyle: BorderStyle = DRAWING_STROKE_STYLE;

	constructor(board: Board) {
		super(board);
		this.setCursor();

		if (DRAWING_SETTINGS_KEY) {
			const drawingSettings = localStorage.getItem(DRAWING_SETTINGS_KEY);
			if (drawingSettings) {
				const { strokeWidth, strokeColor, strokeStyle } =
					JSON.parse(drawingSettings);
				this.strokeWidth = strokeWidth;
				this.strokeColor = strokeColor;
				this.strokeStyle = strokeStyle;
			}
		}
	}

	private updateSettings() {
		localStorage.setItem(
			DRAWING_SETTINGS_KEY,
			JSON.stringify({
				strokeWidth: this.strokeWidth,
				strokeColor: this.strokeColor,
				strokeStyle: this.strokeStyle,
			}),
		);
	}

	setStrokeWidth(strokeWidth: number): void {
		this.strokeWidth = strokeWidth;
		this.updateSettings();
		this.board.tools.publish();
	}

	setStrokeColor(strokeColor: string): void {
		this.strokeColor = strokeColor;
		this.updateSettings();
		this.board.tools.publish();
	}

	getStrokeWidth(): number {
		return this.strokeWidth;
	}

	getStrokeColor(): string {
		return this.strokeColor;
	}

	renderPointerCircle(point: Point, context: DrawingContext) {
		if (this.strokeColor === "none") {
			return;
		}
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
		if (this.strokeColor === "none") {
			return false;
		}
		this.isDown = true;
		const pointer = this.board.pointer.point.copy();
		this.drawing = new Drawing([pointer]);
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.isDown) {
			const pointer = this.board.pointer.point.copy();
			this.drawing.addPoint(pointer);
		}
		this.board.tools.publish();
		return true;
	}

	leftButtonUp(): boolean {
		this.isDown = false;
		const points = this.drawing.points;
		const mbr = this.drawing.getMbr();
		const x = mbr.left;
		const y = mbr.top;
		if (points.length === 0) {
			return false;
		}
		for (const point of points) {
			point.x -= x;
			point.y -= y;
		}
		const drawing = new Drawing(points);
		drawing.transformation.translateTo(x, y);
		drawing.setStrokeColor(this.strokeColor);
		drawing.setStrokeWidth(this.strokeWidth);
		drawing.setBorderStyle(this.strokeStyle);
		this.board.add(drawing);
		this.board.selection.removeAll();
		this.drawing = new Drawing([]);
		this.board.tools.publish();
		return true;
	}
	middleButtonDown(): boolean {
		this.board.tools.navigate();
		const navigate = this.board.tools.getNavigate();
		if (!navigate) {
			return false;
		}
		navigate.returnToTool = this.returnToTool;
		navigate.middleButtonDown();
		return true;
	}

	rightButtonDown(): boolean {
		this.board.tools.navigate();
		const navigate = this.board.tools.getNavigate();
		if (!navigate) {
			return false;
		}
		navigate.returnToTool = this.returnToTool;
		navigate.rightButtonDown();
		return true;
	}

	returnToTool = (): void => {
		this.board.tools.setTool(this);
		this.setCursor();
	};

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
