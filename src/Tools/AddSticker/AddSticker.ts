import { Board } from 'Board';
import { Line, Mbr } from 'Items';
import { DrawingContext } from 'Items/DrawingContext';
import { Sticker } from 'Items/Sticker';
import { CursorName } from 'Pointer/Cursor';
import { tempStorage } from 'SessionStorage';
import { conf } from 'Settings';
import { BoardTool } from 'Tools/BoardTool';

export class AddSticker extends BoardTool {
	static MIN_SIZE = 5;
	line: Line | undefined;
	bounds = new Mbr();

	static defaultWidth?: number = undefined;
	sticker: Sticker;
	isDown = false;
	constructor(board: Board) {
		super(board);
		const lastSticker = this.getLastSticker();
		this.sticker = new Sticker(board, '', lastSticker?.getBackgroundColor());

		this.setCursor(this.sticker.getBackgroundColor());
	}

	setCursor(color?: string) {
		if (conf.STICKER_COLOR_NAMES) {
			const colorName = color
				? conf.STICKER_COLOR_NAMES[conf.STICKER_COLORS.indexOf(color)]
				: undefined;
			this.board.pointer.setCursor(
				colorName ? (`sticker-${colorName}` as CursorName) : 'crosshair'
			);
		} else {
			this.board.pointer.setCursor('crosshair');
		}
	}

	setBackgroundColor(color: string): void {
		this.sticker.apply({
			class: 'Sticker',
			method: 'setBackgroundColor',
			item: [this.sticker.getId()],
			backgroundColor: color,
		});
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
		this.bounds.borderColor = conf.SELECTION_COLOR;
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.line) {
			this.line = new Line(this.line.start.copy(), this.board.pointer.point.copy());
			this.sticker.applyDiagonal(this.line);
			this.bounds = this.sticker.getMbr();
			this.bounds.borderColor = conf.SELECTION_COLOR;
			this.board.tools.publish();
			return true;
		}
		return false;
	}

	leftButtonUp(): boolean {
		const lastSticker = this.getLastSticker();
		if (lastSticker) {
			try {
				AddSticker.defaultWidth = +lastSticker.getWidth();
			} catch (err) {
				console.error('Failed to set AddSticker.defaultWidth', err);
			}
		}
		const width = this.bounds.getWidth();
		const height = this.bounds.getHeight();
		if (width < AddSticker.MIN_SIZE && height < AddSticker.MIN_SIZE) {
			this.sticker.applyTransformToCenter(this.board.pointer.point.copy(), AddSticker.defaultWidth);
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

		this.setLastSticker(this.sticker);
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
		if (this.isDown) {
			this.bounds.render(context);
		}
	}

	private getLastSticker(): Sticker | null {
		const lastSticker = tempStorage.getStickerData();
		if (lastSticker) {
			return new Sticker(this.board).deserialize(lastSticker);
		} else {
			return null;
		}
	}

	private setLastSticker(lastSticker: Sticker): void {
		tempStorage.setStickerData(lastSticker.serialize());
	}
}
