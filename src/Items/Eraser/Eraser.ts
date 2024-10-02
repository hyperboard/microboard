import { Tool } from "../../Tools/Tool";
import { Item } from "../Item";
import { Board } from "../../Board";
import { Drawing } from "../Drawing";
import { Line } from "../Line";
import { Point } from "../Point";

export class Eraser extends Tool {
	itemType: "Eraser";

	constructor(private board: Board) {
		super();
	}

	removeUnderPointOrLine(
		pointerRadius: number,
		startPoint: Point,
		segments: Line[],
	) {
		const items = this.board.items
			.getUnderPointer(pointerRadius)
			.filter(item => {
				return (
					item.itemType === "Drawing" &&
					item.getLines().find(line => {
						return (
							line.getDistance(this.board.pointer.point) <=
							item.strokeWidth / 2 + pointerRadius
						);
					})
				);
			});
		items.push(
			...this.board.items
				.getEnclosedOrCrossed(
					startPoint.x,
					startPoint.y,
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
}
