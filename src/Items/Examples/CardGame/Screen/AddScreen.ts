import { Board } from "Board";
import { ShapeTool } from "Tools/CustomTool";
import {Screen} from "./Screen";

export class AddScreen extends ShapeTool {
  constructor(board: Board, name: string) {
    super(board, name, Screen, { cursorName: "crosshair", fixedRatio: false });
  }

  pointerUp(): boolean {
    (this.item as Screen).applyOwnerId(localStorage.getItem("currentUser") || "");
    return super.pointerUp();
  }
}
