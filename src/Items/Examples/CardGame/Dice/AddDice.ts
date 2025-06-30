import { Board } from "Board";
import { ShapeTool } from "Tools/CustomTool";
import {Dice} from "./Dice";

export class AddDice extends ShapeTool {
  constructor(board: Board, name: string) {
    super(board, name, Dice, { cursorName: "crosshair", fixedRatio: true });
  }
}
