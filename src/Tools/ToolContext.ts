import { DrawingContext } from "Board/Items/DrawingContext";
import { Tool } from "./Tool";

export class ToolContext implements Tool {
	protected tool = new Tool();

	leftButtonDown(): boolean {
		return this.tool.leftButtonDown();
	}

	leftButtonUp(): boolean {
		return this.tool.leftButtonUp();
	}

	leftButtonDouble(): boolean {
		return this.tool.leftButtonDouble();
	}

	rightButtonDown(): boolean {
		return this.tool.rightButtonDown();
	}

	rightButtonUp(): boolean {
		return this.tool.rightButtonUp();
	}

	rightButtonDouble(): boolean {
		return this.tool.rightButtonDouble();
	}

	middleButtonDown(): boolean {
		return this.tool.middleButtonDown();
	}

	middleButtonUp(): boolean {
		return this.tool.middleButtonUp();
	}

	middleButtonDouble(): boolean {
		return this.tool.middleButtonDouble();
	}

	keyDown(key: string): boolean {
		return this.tool.keyDown(key);
	}

	keyUp(key: string): boolean {
		return this.tool.keyUp(key);
	}

	pointerMoveBy(x: number, y: number): boolean {
		return this.tool.pointerMoveBy(x, y);
	}

	render(_context: DrawingContext): void {}
}
