import { Board } from "Board";
import { ShapeTool } from "Tools/CustomTool";
import {Screen} from "./Screen";
import {v4 as uuidv4} from "uuid";

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
    return super.pointerUp();
  }
}
