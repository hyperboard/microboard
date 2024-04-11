import { Mbr, Line } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { BoardTool } from "../BoardTool";
import { Board } from "Board/Board";
import { Sticker, stickerColors } from "Board/Items/Sticker";

let backgroundColor = stickerColors["Sky Blue"];

export class AddSticker extends BoardTool {
    static MIN_SIZE = 5;
    line: Line | undefined;
    bounds = new Mbr();

    static defaultWidth?: number = undefined;
    sticker = new Sticker(undefined, undefined, AddSticker.backgroundColor);
    isDown = false;

    constructor(board: Board) {
        super(board);
        this.setCursor();
    }

    setBackgroundColor(color: string): void {
        backgroundColor = color;
    }

    setCursor(): void {
        this.board.pointer.setCursor("crosshair");
    }

    leftButtonDown(): boolean {
        this.isDown = true;
        const point = this.board.pointer.point;
        this.line = new Line(point.copy(), point.copy());
        this.bounds = this.line.getMbr();
        this.bounds.borderColor = "blue";
        this.board.tools.publish();
        return true;
    }

    pointerMoveBy(_x: number, _y: number): boolean {
        if (this.line) {
            this.line = new Line(
                this.line.start.copy(),
                this.board.pointer.point.copy(),
            );
            this.sticker.setDiagonal(this.line)
            this.bounds = this.sticker.getMbr()
            this.bounds.borderColor = "blue";
            this.board.tools.publish();
            return true;
        }
        return false;
    }

    leftButtonUp(): boolean {
        const lastSticker = this.getLastSticker();
        if (lastSticker) {
            backgroundColor = lastSticker.backgroundColor;
        }
        const width = this.bounds.getWidth();
        const height = this.bounds.getHeight();
        if (width < AddSticker.MIN_SIZE && height < AddSticker.MIN_SIZE) {
            this.sticker.transformToCenter(this.board.pointer.point.copy(), AddSticker.defaultWidth)
        }
        this.sticker.setBackgroundColor(backgroundColor);
        const sticker = this.board.add(this.sticker);

        this.board.selection.removeAll();
        this.board.selection.add(sticker);
        this.board.selection.setContext("EditTextUnderPointer");
        this.board.selection.editText();
        this.board.tools.select();
        this.board.tools.publish();

        if (this.line && this.line.getMbr().getWidth() > AddSticker.MIN_SIZE) {
            const mbr = this.line.getMbr()
            AddSticker.defaultWidth = mbr.getWidth();
        }

        this.setLastSticker(this.sticker);

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
