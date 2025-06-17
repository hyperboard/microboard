import { Board } from "Board";
import { Line, Mbr, Point } from "Items/index";
import { ShapeTool } from "Tools/CustomTool";
import { Star } from "../Star/Star";

export class AddStar extends ShapeTool {
	constructor(board: Board, name: string) {
		super(board, name, Star, { cursorName: "crosshair", fixedRatio: true });
	}

	override keyDown(key: string): boolean {
		const result = super.keyDown(key);
		if (result) {
			return result;
		}
		if (key === " ") {
			this.createStarInRandomPlace();
			return true;
		}
		return false;
	}

	createStarInRandomPlace(): void {
		const { left, top, bottom, right } = this.board.camera.getMbr();
		const viewWidth = right - left;
		const viewHeight = bottom - top;
		const x = left + Math.random() * viewWidth;
		const y = top + Math.random() * viewHeight;
		this.bounds = new Mbr(x, y, x, y);
		this.line = new Line(new Point(x, y), new Point(x, y));
		this.initTransformation();
		this.board.tools.publish();
		this.pointerUp();
	}
}
