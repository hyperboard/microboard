import { Board } from "Board";
import { ToolContext } from "./ToolContext";
import { Tools } from "./Tools";

export class BoardToolContext extends ToolContext {
	constructor(protected boardTools: Tools, protected board: Board) {
		super();
	}
}
