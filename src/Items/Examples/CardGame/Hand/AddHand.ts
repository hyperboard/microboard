import { Board } from "Board";
import { ShapeTool } from "Tools/CustomTool";
import {Hand} from "./Hand";

export class AddDice extends ShapeTool {
  constructor(board: Board, name: string) {
    super(board, name, Hand, { cursorName: "crosshair", fixedRatio: false });
  }

  pointerUp(): boolean {
    this.item.ownerId = localStorage.getItem("currentUser") || ""
    return super.pointerUp();
  }
}
