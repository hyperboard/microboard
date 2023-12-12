import { Mbr, Line, Shape } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { ShapeType } from "Board/Items/Shape/Basic";
import { BoardTool } from "../BoardTool";
import { Board } from "Board/Board";

export class AddShape extends BoardTool {
	line: Line | undefined;
	bounds = new Mbr();
	type: ShapeType = "Rectangle";
	shape = new Shape();
	isDown = false;

	constructor(board: Board) {
		super(board);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor("crosshair");
	}

	setShapeType(type: ShapeType): void {
		this.type = type;
	}

	_initTransformation(sx?:number, sy?:number) {
		sx = sx || this.bounds.getWidth() / 100;
		sy = sy || this.bounds.getHeight() / 100
		this.shape.transformation.translateTo(this.bounds.left,this.bounds.top);
		this.shape.transformation.scaleTo(sx,sy);
	}

	leftButtonDown(): boolean {
		this.isDown = true;
		const point = this.board.pointer.point;
		this.line = new Line(point.copy(), point.copy());
		this.bounds = this.line.getMbr();
		this.bounds.borderColor = "blue";
		this.shape.setShapeType(this.type);
		this._initTransformation();
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.line) {
			this.line = new Line(
				this.line.start.copy(),
				this.board.pointer.point.copy(),
			);
			this.bounds = this.line.getMbr();
			this.bounds.borderColor = "blue";
			this._initTransformation();
			this.board.tools.publish();
			return true;
		}
		return false;
	}

	leftButtonUp(): boolean {
		let width = this.bounds.getWidth();
		let height = this.bounds.getHeight();
		if (width < 2) {
			width = 100;
		}
		if (height < 2) {
			height = 100;
		}
		this._initTransformation(width / 100, height / 100);
		const shape = this.board.add(this.shape);
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
			this.shape.render(context);
			this.bounds.render(context);
		}
	}
}
