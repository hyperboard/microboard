import { Board } from "Board";
import { ShapeTool } from "Tools/CustomTool";
import {Screen} from "./Screen";
import {v4 as uuidv4} from "uuid";
import {Item} from "Items/";

export class AddScreen extends ShapeTool {
  constructor(board: Board, name: string) {
    super(board, name, Screen, { cursorName: "crosshair", fixedRatio: false });
  }

  pointerUp(): boolean {
    let screenOwnerId = localStorage.getItem("currentUser") || localStorage.getItem("screenOwnerId");
    if (!screenOwnerId) {
      screenOwnerId = uuidv4();
      localStorage.setItem("screenOwnerId", screenOwnerId);
    }
    (this.item as Screen).applyOwnerId(screenOwnerId);
    const currMbr = this.item.getMbr();
    const screenChildren = this.board.items
      .getEnclosedOrCrossed(currMbr.left, currMbr.top, currMbr.right, currMbr.bottom)
      .filter(item => item.parent === 'Board')
      .filter(item => this.item.handleNesting(item));
    const width = this.bounds.getWidth() < 2 ? 100 : this.bounds.getWidth();
    const height =
      this.bounds.getHeight() < 2 ? 100 : this.bounds.getHeight();
    this.initTransformation(width / 100, height / 100);
    const screen = this.board.add(this.item);
    screen.emitNesting(screenChildren);
    this.isDown = false;
    this.board.selection.removeAll();
    this.board.selection.add(screen);
    this.board.tools.select();
    this.board.tools.publish();
    return true;
  }
}
