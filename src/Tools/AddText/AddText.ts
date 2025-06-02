import { Board } from 'Board';
import { Line, Mbr, Point, RichText } from 'Items';
import { DrawingContext } from 'Items/DrawingContext';
import { conf } from 'Settings';
import { BoardTool } from 'Tools/BoardTool';

const height = 16;

export class AddText extends BoardTool {
	line: Line | undefined;
	bounds = new Mbr();

	constructor(private board: Board) {
		super(board);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor('text');
	}

	leftButtonDown(): boolean {
		const point = this.board.pointer.point;
		this.line = new Line(point.copy(), point.copy());
		this.bounds = this.line.getMbr();
		this.bounds.borderColor = conf.SELECTION_COLOR;
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
			this.bounds.borderColor = conf.SELECTION_COLOR;
			this.board.tools.publish();
			return true;
		}
		return false;
	}

	async leftButtonUp(): Promise<boolean> {
		if (this.line) {
			const board = this.board;

			const richText = new RichText(this.board, new Mbr());
			richText.transformation.applyTranslateTo(this.bounds.left, this.bounds.top);
			richText.transformation.applyScaleBy(1, 1);
			richText.editor.maxWidth = 600;
			richText.insideOf = richText.itemType;
			const text = await board.add(richText);
			this.board.selection.removeAll();
			this.board.selection.add(text);
			this.board.selection.editText();
			this.board.tools.select();
			this.board.tools.publish();
			this.line = undefined;
		}
		return true;
	}

	keyDown(key: string): boolean {
		if (key === 'Escape') {
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
