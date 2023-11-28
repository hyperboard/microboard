import { Board } from "Board";
import { Tool } from "./Tool";

export class BoardTool extends Tool {
	constructor(protected board: Board) {
		super();
	}
}
