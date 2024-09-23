import { Board } from "Board/Board";
import { BoardTool } from "../BoardTool";

export class Navigate extends BoardTool {
	isDown = false;
	isDraggingBoard = false;

	constructor(board: Board) {
		super(board);
		this.board.pointer.setCursor("grab");
	}

	returnToTool = (): void => {};

	pointerMoveBy(x: number, y: number): boolean {
		if (this.isDown) {
			this.board.camera.translateBy(x, y);
			return true;
		}
		return false;
	}

	private down(): void {
		this.board.pointer.setCursor("grabbing");
		this.isDown = true;
	}

	leftButtonDown(): boolean {
		this.down();
		return true;
	}

	middleButtonDown(): boolean {
		this.down();
		return true;
	}

	rightButtonDown(): boolean {
		this.down();
		return true;
	}

	private up(): void {
		this.board.pointer.setCursor("grab");
		this.isDown = false;
		if (!this.isDraggingBoard) {
			this.board.selection.selectUnderPointer();
		} else {
			this.isDraggingBoard = false;
		}
	}

	leftButtonUp(): boolean {
		this.up();
		return true;
	}

	middleButtonUp(): boolean {
		this.up();
		this.returnToTool();
		return true;
	}

	rightButtonUp(): boolean {
		this.up();
		this.returnToTool();
		return true;
	}

	leftButtonDouble(): boolean {
		this.board.selection.editTextUnderPointer();
		this.board.tools.select();
		return true;
	}

	keyDown(key: string): boolean {
		if (key === "Shift") {
			this.board.tools.select();
			return true;
		}
		return false;
	}
}
