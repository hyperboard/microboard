import { Board } from "Board/Board";
import { Line, Mbr } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Sticker } from "Board/Items/Sticker";
import { SELECTION_COLOR } from "View/Tools/Selection";
import { BoardTool } from "../BoardTool";
import { STICKER_COLOR_NAMES, STICKER_COLORS } from "View/Tools/AddSticker";
import { CursorName } from "Board/Pointer/Cursor";

export class AddSticker extends BoardTool {
	static MIN_SIZE = 5;
	line: Line | undefined;
	bounds = new Mbr();

	static defaultWidth?: number = undefined;
	sticker = new Sticker(undefined, undefined);
	isDown = false;
	constructor(board: Board) {
		super(board);
		const bgColor = sessionStorage.getItem("lastStickerBg");

		this.sticker = new Sticker(
			undefined,
			undefined,
			bgColor ? JSON.parse(bgColor) : undefined,
		);

		this.setCursor(this.sticker.getBackgroundColor());
	}

	setCursor(color?: string) {
		if (STICKER_COLOR_NAMES) {
			const colorName = color
				? STICKER_COLOR_NAMES[STICKER_COLORS.indexOf(color)]
				: undefined;
			this.board.pointer.setCursor(
				colorName
					? (`sticker-${colorName}` as CursorName)
					: "crosshair",
			);
		} else {
			this.board.pointer.setCursor("crosshair");
		}
	}

	setBackgroundColor(color: string): void {
		this.sticker.setBackgroundColor(color);
		this.setCursor(color);
		this.board.tools.publish();
	}

	getBackgroundColor(): string {
		return this.sticker.getBackgroundColor();
	}

	leftButtonDown(): boolean {
		this.isDown = true;
		const point = this.board.pointer.point;
		this.line = new Line(point.copy(), point.copy());
		this.bounds = this.line.getMbr();
		this.bounds.borderColor = SELECTION_COLOR;
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.line) {
			this.line = new Line(
				this.line.start.copy(),
				this.board.pointer.point.copy(),
			);
			this.sticker.setDiagonal(this.line);
			this.bounds = this.sticker.getMbr();
			this.bounds.borderColor = SELECTION_COLOR;
			this.board.tools.publish();
			return true;
		}
		return false;
	}

	leftButtonUp(): boolean {
		const width = this.bounds.getWidth();
		const height = this.bounds.getHeight();
		if (width < AddSticker.MIN_SIZE && height < AddSticker.MIN_SIZE) {
			let width = sessionStorage.getItem("lastStickerWidth");
			let height = sessionStorage.getItem("lastStickerHeight");
			if (width) {
				width = JSON.parse(width);
			}
			if (height) {
				height = JSON.parse(height);
			}
			this.sticker.transformToCenter(
				this.board.pointer.point.copy(),
				width ? +width : AddSticker.defaultWidth,
				height ? +height : undefined,
			);
		}
		const sticker = this.board.add(this.sticker);
		this.board.selection.removeAll();
		this.board.selection.add(sticker);
		this.board.selection.editText();
		this.board.tools.select();
		this.board.tools.publish();

		if (this.line && this.line.getMbr().getWidth() > AddSticker.MIN_SIZE) {
			const mbr = this.line.getMbr();
			AddSticker.defaultWidth = mbr.getWidth();
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
		if (this.isDown) {
			this.bounds.render(context);
		}
	}
}
