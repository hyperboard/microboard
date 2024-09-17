import { Board } from "Board/Board";
import { Line, Mbr } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Sticker } from "Board/Items/Sticker";
import { SELECTION_COLOR } from "View/Tools/Selection";
import { BoardTool } from "../BoardTool";
import { STICKER_COLOR_NAMES, STICKER_COLORS } from "View/Tools/AddSticker";
import { CursorName } from "Board/Pointer/Cursor";
import { Template } from "../../Items/Template";

export class AddTemplate extends BoardTool {
	static MIN_SIZE = 5;
	line: Line | undefined;
	bounds = new Mbr();
	template: Template;

	static defaultWidth?: number = undefined;
	isDown = false;
	constructor(board: Board) {
		super(board);
		this.template = new Template();
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
		if (this.isDown) {
			this.bounds.render(context);
		}
	}

	private getLastSticker(): Sticker | null {
		const lastSticker = sessionStorage.getItem("lastSticker");
		if (lastSticker) {
			return JSON.parse(lastSticker);
		} else {
			return null;
		}
	}

	private setLastSticker(lastSticker: Sticker): void {
		sessionStorage.setItem("lastSticker", JSON.stringify(lastSticker));
	}
}
