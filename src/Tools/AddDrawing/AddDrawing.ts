import { Drawing } from "Board/Items/Drawing";
import { DrawingContext } from "Board/Items/DrawingContext";
import { BoardTool } from "../BoardTool";
import { BorderStyle } from "Board/Items/Path";
import { Board } from "Board/Board";
import { penCursor, penCursorTalk } from "Board/Pointer/Cursor";

export class AddDrawing extends BoardTool {
	drawing = new Drawing([]);
	isDown = false;
	strokeWidth = 1;
	strokeStyle = "black";
	borderStyle: BorderStyle = "solid";

	constructor(board: Board) {
		super(board);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor(penCursorTalk);
	}

	leftButtonDown(): boolean {
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
			this.board.tools.publish();
		}
		return true;
	}

	leftButtonUp(): boolean {
		this.isDown = false;
		const points = this.drawing.points;
		const mbr = this.drawing.getMbr();
		const x = mbr.left;
		const y = mbr.top;
		for (const point of points) {
			point.x -= x;
			point.y -= y;
		}
		const drawing = new Drawing(points);
		drawing.transformation.translateTo(x, y);
		drawing.setStrokeColor(this.strokeStyle);
		drawing.setStrokeWidth(this.strokeWidth);
		drawing.setBorderStyle(this.borderStyle);
		const boarddrawing = this.board.add(drawing);
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
		drawing.setStrokeColor(this.strokeStyle);
		drawing.setStrokeWidth(this.strokeWidth);
		drawing.setBorderStyle(this.borderStyle);
		drawing.render(context);
	}
}
