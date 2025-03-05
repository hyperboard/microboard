import { Board } from "Board/Board";
import { Drawing } from "Board/Items/Drawing";
import { DrawingContext } from "Board/Items/DrawingContext";
import {
	ERASER_DEFAULT_COLOR,
	PEN_STROKE_STYLE,
	ERASER_STROKE_WIDTH,
	ERASER_MAX_LINE_LENGTH,
} from "Board/Settings";
import { BorderStyle } from "../../Items/Path";
import { BoardTool } from "../BoardTool";

export class Eraser extends BoardTool {
	itemType = "Eraser";
	isDown = false;
	strokeWidth = ERASER_STROKE_WIDTH;
	strokeColor = ERASER_DEFAULT_COLOR;
	strokeStyle: BorderStyle = PEN_STROKE_STYLE;
	drawing = new Drawing([]);
	maxPointsInLine = ERASER_MAX_LINE_LENGTH;

	constructor(board: Board) {
		super(board);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor("eraser");
	}

	leftButtonDown(): boolean {
		this.isDown = true;
		this.board.tools.publish();
		return true;
	}

	removeUnderPointOrLine() {
		const segments = this.drawing.getLines();
		const items = this.board.items
			.getUnderPointer(this.strokeWidth / 2)
			.filter(item => {
				return (
					item.itemType === "Drawing" &&
					item.getLines().find(line => {
						return (
							line.getDistance(this.board.pointer.point) <=
							item.strokeWidth / 2 + this.strokeWidth / 2
						);
					})
				);
			});
		items.push(
			...this.board.items
				.getEnclosedOrCrossed(
					this.drawing.points[0].x,
					this.drawing.points[0].y,
					this.board.pointer.point.x,
					this.board.pointer.point.y,
				)
				.filter(item => {
					return (
						item.itemType === "Drawing" &&
						item.getLines().some(line => {
							return segments.some(segment =>
								segment.hasIntersectionPoint(line),
							);
						})
					);
				}),
		);
		if (items.length) {
			this.board.selection.add(items);
			this.board.selection.removeFromBoard();
		}
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.isDown) {
			const pointer = this.board.pointer.point.copy();
			const points = this.drawing.points;
			if (points.length > this.maxPointsInLine) {
				points.splice(0, points.length - this.maxPointsInLine);
			}
			this.drawing.addPoint(pointer);
			setTimeout(() => {
				if (this && this.drawing.points.length > 1) {
					this.drawing.points.shift();
				}
			}, 200);
			this.removeUnderPointOrLine();
		}
		this.board.tools.publish();
		return true;
	}

	leftButtonUp(): boolean {
		this.isDown = false;
		this.drawing = new Drawing([]);
		this.board.selection.removeAll();
		this.board.tools.publish();
		return true;
	}

	rightButtonDown(): boolean {
		return true;
	}

	render(context: DrawingContext): void {
		const drawing = this.drawing;
		drawing.setStrokeColor(this.strokeColor);
		drawing.setStrokeWidth(this.strokeWidth);
		drawing.setBorderStyle(this.strokeStyle);
		drawing.render(context);
	}
}
