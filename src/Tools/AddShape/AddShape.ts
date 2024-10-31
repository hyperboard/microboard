import { Board } from "Board/Board";
import { Line, Mbr, Point, Shape } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { ShapeType } from "Board/Items/Shape";
import { DefaultShapeData } from "Board/Items/Shape/ShapeData";
import { ADD_TO_SELECTION, DEFAULT_SHAPE } from "View/Tools/AddShape";
import { SELECTION_COLOR } from "View/Tools/Selection";
import { BoardTool } from "../BoardTool";
import { ResizeType } from "Board/Selection/Transformer/getResizeType";
import { SessionStorage } from "../../../App/SessionStorage";

export class AddShape extends BoardTool {
	line: Line | undefined;
	resizeType: ResizeType = "leftBottom";
	bounds = new Mbr();
	type: ShapeType | "None" = DEFAULT_SHAPE;
	shape: Shape;
	isDown = false;
	isShiftPressed = false;
	storage = new SessionStorage();

	private handleKeyDownBound: (event: KeyboardEvent) => void;
	private handleKeyUpBound: (event: KeyboardEvent) => void;
	constructor(board: Board) {
		super(board);
		this.setCursor();
		const savedShapeData = this.storage.getShapeData(board.getBoardId());

		if (savedShapeData) {
			const data = savedShapeData;
			this.shape = new Shape(
				undefined,
				"",
				data.shapeType,
				data.backgroundColor,
				data.backgroundOpacity,
				data.borderColor,
				data.borderOpacity,
				data.borderStyle,
				data.borderWidth,
			);
			this.setShapeType(data.shapeType);
		} else {
			this.shape = new Shape();
		}

		this.handleKeyDownBound = this.handleKeyDown.bind(this);
		this.handleKeyUpBound = this.handleKeyUp.bind(this);

		window.addEventListener("keydown", this.handleKeyDownBound);
		window.addEventListener("keyup", this.handleKeyUpBound);
	}

	handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Shift") {
			this.isShiftPressed = true;
		}
	}

	handleKeyUp(event: KeyboardEvent) {
		if (event.key === "Shift") {
			this.isShiftPressed = false;
		}
	}

	setCursor(): void {
		this.board.pointer.setCursor("crosshair");
	}

	setShapeType(type: ShapeType): void {
		this.type = type;
		this.board.tools.publish();
	}

	initTransformation(sx?: number, sy?: number) {
		sx = sx || this.bounds.getWidth() / 100;
		sy = sy || this.bounds.getHeight() / 100;
		this.shape.transformation.translateTo(
			this.bounds.left,
			this.bounds.top,
		);
		this.shape.transformation.scaleTo(sx, sy);
	}

	leftButtonDown(): boolean {
		if (this.type === "None") {
			return false;
		}
		this.isDown = true;
		const point = this.board.pointer.point;
		this.line = new Line(point.copy(), point.copy());
		this.bounds = this.line.getMbr();
		this.bounds.borderColor = SELECTION_COLOR;
		this.shape.setShapeType(this.type);
		this.initTransformation();
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.line) {
			const startPoint = this.line.start.copy();
			const endPoint = this.board.pointer.point.copy();

			if (this.isShiftPressed) {
				const deltaX = endPoint.x - startPoint.x;
				const deltaY = endPoint.y - startPoint.y;
				const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
				endPoint.x = startPoint.x + Math.sign(deltaX) * maxDelta;
				endPoint.y = startPoint.y + Math.sign(deltaY) * maxDelta;
			}

			this.line = new Line(startPoint, endPoint);
			this.bounds = this.line.getMbr();
			this.bounds.borderColor = SELECTION_COLOR;
			this.initTransformation();
			this.board.tools.publish();
			return true;
		}

		return false;
	}

	leftButtonUp(): boolean {
		if (this.type === "None") {
			return false;
		}
		const storage = this.storage;
		const boardId = this.board.getBoardId();
		let width = this.bounds.getWidth();
		let height = this.bounds.getHeight();
		if (width < 2) {
			const savedWidth = storage.getShapeWidth(boardId);
			if (savedWidth) {
				width = savedWidth;
			} else {
				width = 100;
			}
		} else {
			storage.saveShapeWidth(width, boardId);
		}
		if (height < 2) {
			const savedHeight = storage.getShapeHeight(boardId);
			if (savedHeight) {
				height = savedHeight;
			} else {
				height = 100;
			}
		} else {
			storage.saveShapeHeight(height, boardId);
		}
		this.initTransformation(width / 100, height / 100);
		const shape = this.board.add(this.shape);
		storage.saveShapeData(shape, boardId);
		this.isDown = false;
		if (ADD_TO_SELECTION) {
			this.board.selection.removeAll();
			this.board.selection.add(shape);
			this.board.selection.editText();
			this.board.tools.select();
		}
		this.board.tools.publish();

		window.removeEventListener("keydown", this.handleKeyDownBound);
		window.removeEventListener("keyup", this.handleKeyUpBound);
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

	createShapeInCenter(shape: ShapeType) {
		if (this.type === "None") {
			return;
		}
		this.setShapeType(shape);
		const { left, top, bottom, right } = this.board.camera.getMbr();
		const x = (left + right) / 2 - 50;
		const y = (top + bottom) / 2 - 50;
		this.bounds = new Mbr(x, y, x, y);
		this.line = new Line(new Point(x, y), new Point(x, y));
		this.bounds.borderColor = SELECTION_COLOR;
		this.shape.setShapeType(this.type);
		this.initTransformation();
		this.board.tools.publish();
		this.leftButtonUp();
	}

	render(context: DrawingContext): void {
		if (this.isDown) {
			this.shape.render(context);
			this.bounds.render(context);
		}
	}
}
