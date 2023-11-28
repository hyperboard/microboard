import { Line, Mbr, Point, RichText } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { BoardTool } from "../BoardTool";
import { Board } from "Board/Board";

const minWidth = 100;
const height = 16;

export class AddText extends BoardTool {
	line: Line | undefined;
	bounds = new Mbr();

	constructor(board: Board) {
		super(board);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor("text");
	}

	leftButtonDown(): boolean {
		const point = this.board.pointer.point;
		this.line = new Line(point.copy(), point.copy());
		this.bounds = this.line.getMbr();
		this.bounds.borderColor = "blue";
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.line) {
			const cursorPoint = this.board.pointer.point;
			const start = this.line.start.copy();
			// use the cursor point to determine the height of the text
			const end = new Point(cursorPoint.x, start.y + height);
			this.line = new Line(start, end);

			this.bounds = this.line.getMbr();
			this.bounds.borderColor = "blue";
			this.board.tools.publish();
			return true;
		}
		return false;
	}

	leftButtonUp(): boolean {
		if (this.line) {
			const maxWidth = this.bounds.getWidth();

			const text = this.board.add(new RichText(new Mbr()));
			text.transformation.translateTo(this.bounds.left, this.bounds.top);
			text.transformation.scaleBy(1, 1);
			text.editor.setSelectionHorisontalAlignment("left");
			// text.setMaxWidth(Math.max(maxWidth, minWidth));
			this.board.tools.select();
			this.board.tools.publish();
			this.board.selection.removeAll();
			this.board.selection.add(text);
			this.board.selection.setContext("EditTextUnderPointer");
			this.board.tools.select();
			this.board.tools.publish();
			this.board.selection.editSelected();
			this.line = undefined;
		}
		return true;
	}

	keyDown(key: string): boolean {
		if (key === "Escape") {
			this.board.tools.select();
			return true;
		}
		return false;
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
		if (this.line) {
			this.bounds.render(context);
		}
	}
}
