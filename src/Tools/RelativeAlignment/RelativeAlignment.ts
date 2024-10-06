import { Item, Line, Point } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { SpatialIndex } from "Board/SpatialIndex";

export class AlignmentHelper {
	private alignThreshold = 2;
	snapThreshold = 2;
	constructor(private spatialIndex: SpatialIndex) {}
	checkAlignment(movingItem: Item): {
		verticalLines: Line[];
		horizontalLines: Line[];
	} {
		const movingMBR = movingItem.getMbr();
		const nearbyItems = this.spatialIndex.getNearestTo(
			movingMBR.getCenter(),
			6,
			(otherItem: Item) => otherItem !== movingMBR,
			2000,
		);

		const verticalLines: Line[] = [];
		const horizontalLines: Line[] = [];

		nearbyItems.forEach(item => {
			if (item === movingItem) {
				return;
			}
			const itemMbr = item.getMbr();

			const centerXMoving = (movingMBR.left + movingMBR.right) / 2;
			const centerXItem = (itemMbr.left + itemMbr.right) / 2;

			if (Math.abs(centerXItem - centerXMoving) < this.alignThreshold) {
				verticalLines.push(
					new Line(
						new Point(
							centerXItem,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							centerXItem,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}

			const centerYMoving = (movingMBR.top + movingMBR.bottom) / 2;
			const centerYItem = (itemMbr.top + itemMbr.bottom) / 2;

			if (Math.abs(centerYItem - centerYMoving) < this.alignThreshold) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							centerYItem,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							centerYItem,
						),
					),
				);
			}

			if (Math.abs(itemMbr.left - movingMBR.left) < this.alignThreshold) {
				verticalLines.push(
					new Line(
						new Point(
							itemMbr.left,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							itemMbr.left,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}
			if (
				Math.abs(itemMbr.right - movingMBR.right) < this.alignThreshold
			) {
				verticalLines.push(
					new Line(
						new Point(
							itemMbr.right,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							itemMbr.right,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}

			if (Math.abs(itemMbr.top - movingMBR.top) < this.alignThreshold) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							itemMbr.top,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							itemMbr.top,
						),
					),
				);
			}
			if (
				Math.abs(itemMbr.bottom - movingMBR.bottom) <
				this.alignThreshold
			) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							itemMbr.bottom,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							itemMbr.bottom,
						),
					),
				);
			}
			if (
				Math.abs(itemMbr.left - movingMBR.right) < this.alignThreshold
			) {
				verticalLines.push(
					new Line(
						new Point(
							itemMbr.left,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							itemMbr.left,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}
			if (
				Math.abs(itemMbr.right - movingMBR.left) < this.alignThreshold
			) {
				verticalLines.push(
					new Line(
						new Point(
							itemMbr.right,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							itemMbr.right,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}
			if (
				Math.abs(itemMbr.top - movingMBR.bottom) < this.alignThreshold
			) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							itemMbr.top,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							itemMbr.top,
						),
					),
				);
			}
			if (
				Math.abs(itemMbr.bottom - movingMBR.top) < this.alignThreshold
			) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							itemMbr.bottom,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							itemMbr.bottom,
						),
					),
				);
			}
			if (Math.abs(centerXMoving - itemMbr.left) < this.alignThreshold) {
				verticalLines.push(
					new Line(
						new Point(
							itemMbr.left,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							itemMbr.left,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}
			if (Math.abs(centerXMoving - itemMbr.right) < this.alignThreshold) {
				verticalLines.push(
					new Line(
						new Point(
							itemMbr.right,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							itemMbr.right,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}
			if (Math.abs(centerYMoving - itemMbr.top) < this.alignThreshold) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							itemMbr.top,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							itemMbr.top,
						),
					),
				);
			}
			if (
				Math.abs(centerYMoving - itemMbr.bottom) < this.alignThreshold
			) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							itemMbr.bottom,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							itemMbr.bottom,
						),
					),
				);
			}
			if (Math.abs(movingMBR.top - centerYItem) < this.alignThreshold) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							centerYItem,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							centerYItem,
						),
					),
				);
			}
			if (
				Math.abs(movingMBR.bottom - centerYItem) < this.alignThreshold
			) {
				horizontalLines.push(
					new Line(
						new Point(
							Math.min(itemMbr.left, movingMBR.left),
							centerYItem,
						),
						new Point(
							Math.max(itemMbr.right, movingMBR.right),
							centerYItem,
						),
					),
				);
			}
			if (Math.abs(movingMBR.left - centerXItem) < this.alignThreshold) {
				verticalLines.push(
					new Line(
						new Point(
							centerXItem,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							centerXItem,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}
			if (Math.abs(movingMBR.right - centerXItem) < this.alignThreshold) {
				verticalLines.push(
					new Line(
						new Point(
							centerXItem,
							Math.min(itemMbr.top, movingMBR.top),
						),
						new Point(
							centerXItem,
							Math.max(itemMbr.bottom, movingMBR.bottom),
						),
					),
				);
			}
		});

		return { verticalLines, horizontalLines };
	}

	snapToClosestLine(
		draggingItem: Item,
		snapLines: { verticalLines: Line[]; horizontalLines: Line[] },
		beginTimeStamp: number,
	): boolean {
		const itemMbr = draggingItem.getMbr();
		const itemCenterX = (itemMbr.left + itemMbr.right) / 2;
		const itemCenterY = (itemMbr.top + itemMbr.bottom) / 2;

		const findClosestLine = (
			lines: Line[],
			getDistance: (line: Line) => number,
		) => {
			let closestLine: Line | null = null;
			let minDistance = this.snapThreshold;

			lines.forEach(line => {
				const distance = getDistance(line);
				if (distance < minDistance) {
					minDistance = distance;
					closestLine = line;
				}
			});

			return closestLine;
		};

		const closestVerticalLine = findClosestLine(
			snapLines.verticalLines,
			line => {
				return Math.min(
					Math.abs(itemMbr.left - line.start.x),
					Math.abs(itemMbr.right - line.start.x),
					Math.abs(itemCenterX - line.start.x),
					Math.abs(itemCenterX - line.end.x),
				);
			},
		);

		const closestHorizontalLine = findClosestLine(
			snapLines.horizontalLines,
			line => {
				return Math.min(
					Math.abs(itemMbr.top - line.start.y),
					Math.abs(itemMbr.bottom - line.start.y),
					Math.abs(itemCenterY - line.start.y),
					Math.abs(itemCenterY - line.end.y),
				);
			},
		);

		const snapToLine = (line: Line | null, isVertical: boolean) => {
			if (!line) {
				return false;
			}

			if (isVertical) {
				if (
					Math.abs(itemMbr.left - line.start.x) < this.snapThreshold
				) {
					draggingItem.transformation.translateBy(
						line.start.x - itemMbr.left,
						0,
						beginTimeStamp,
					);
				} else if (
					Math.abs(itemMbr.right - line.start.x) < this.snapThreshold
				) {
					draggingItem.transformation.translateBy(
						line.start.x - itemMbr.right,
						0,
						beginTimeStamp,
					);
				} else if (
					Math.abs(itemCenterX - line.start.x) < this.snapThreshold
				) {
					draggingItem.transformation.translateBy(
						line.start.x - itemCenterX,
						0,
						beginTimeStamp,
					);
				} else if (
					Math.abs(itemCenterX - line.end.x) < this.snapThreshold
				) {
					draggingItem.transformation.translateBy(
						line.end.x - itemCenterX,
						0,
						beginTimeStamp,
					);
				}
			} else {
				if (Math.abs(itemMbr.top - line.start.y) < this.snapThreshold) {
					draggingItem.transformation.translateBy(
						0,
						line.start.y - itemMbr.top,
						beginTimeStamp,
					);
				} else if (
					Math.abs(itemMbr.bottom - line.start.y) < this.snapThreshold
				) {
					draggingItem.transformation.translateBy(
						0,
						line.start.y - itemMbr.bottom,
						beginTimeStamp,
					);
				} else if (
					Math.abs(itemCenterY - line.start.y) < this.snapThreshold
				) {
					draggingItem.transformation.translateBy(
						0,
						line.start.y - itemCenterY,
						beginTimeStamp,
					);
				} else if (
					Math.abs(itemCenterY - line.end.y) < this.snapThreshold
				) {
					draggingItem.transformation.translateBy(
						0,
						line.end.y - itemCenterY,
						beginTimeStamp,
					);
				}
			}

			return true;
		};

		const snappedToVertical = snapToLine(closestVerticalLine, true);
		const snappedToHorizontal = snapToLine(closestHorizontalLine, false);

		return snappedToVertical || snappedToHorizontal;
	}

	renderSnapLines(
		context: DrawingContext,
		snapLines: { verticalLines: Line[]; horizontalLines: Line[] },
		scale: number,
	): void {
		context.ctx.save();
		context.ctx.strokeStyle = "rgba(0, 0, 255, 1)";
		context.ctx.lineWidth = 1 / scale;
		context.ctx.setLineDash([5, 5]);

		snapLines.verticalLines.forEach(line => {
			context.ctx.beginPath();
			context.ctx.moveTo(line.start.x, line.start.y);
			context.ctx.lineTo(line.end.x, line.end.y);
			context.ctx.stroke();
		});

		snapLines.horizontalLines.forEach(line => {
			context.ctx.beginPath();
			context.ctx.moveTo(line.start.x, line.start.y);
			context.ctx.lineTo(line.end.x, line.end.y);
			context.ctx.stroke();
		});

		context.ctx.restore();
	}
}
