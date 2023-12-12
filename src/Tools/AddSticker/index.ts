import { Mbr, Line } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { BoardTool } from "../BoardTool";
import { Board } from "Board/Board";
import {Sticker} from "../../Items/Sticker";

export class AddSticker extends BoardTool {
    line: Line | undefined;
    bounds = new Mbr();
    sticker = new Sticker(undefined,undefined,undefined);
    isDown = false;

    constructor(board: Board) {
        super(board);
        this.setCursor();
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
        let width = this.bounds.getWidth();
        let height = this.bounds.getHeight();
        if (width < 2 && height < 2) {
            this.sticker.transformToCenter(this.board.pointer.point.copy())
        }
        const shape = this.board.add(this.sticker);
        this.board.selection.removeAll();
        this.board.selection.add(shape);
        this.board.selection.setContext("EditTextUnderPointer");
        this.board.tools.select();
        this.board.tools.publish();
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
