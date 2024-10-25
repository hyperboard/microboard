import { Board } from "Board/Board";
import { Item, Line, Point } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { SpatialIndex } from "Board/SpatialIndex";

export class AlignmentHelper {
	private alignThreshold = 10;
	private snapMemory: { x: number | null; y: number | null } = {
		x: null,
		y: null,
	};
	board: Board;
	snapThreshold = 10;

	constructor(board: Board, private spatialIndex: SpatialIndex) {
		this.board = board;
	}

	calculateLineThickness(zoom: number): number {
		const baseThickness = 1;
		return baseThickness / (zoom / 100);
	}

	checkAlignment(movingItem: Item): {
		verticalLines: Line[];
		horizontalLines: Line[];
	} {
		const movingMBR = movingItem.getMbr();
		const camera = this.board.camera.getMbr();
		const nearbyItems = this.spatialIndex.getNearestTo(
			movingMBR.getCenter(),
			15,
			(otherItem: Item) =>
				otherItem !== movingMBR &&
				otherItem.itemType !== "Connector" &&
				otherItem.itemType !== "Drawing" &&
				otherItem.isInView(camera),
			5000,
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

			const centerYMoving = (movingMBR.top + movingMBR.bottom) / 2;
			const centerYItem = (itemMbr.top + itemMbr.bottom) / 2;

			const isSameWidth =
				Math.abs(itemMbr.right - itemMbr.left) ===
				Math.abs(movingMBR.right - movingMBR.left);
			const isSameHeight =
				Math.abs(itemMbr.bottom - itemMbr.top) ===
				Math.abs(movingMBR.bottom - movingMBR.top);

			if (!isSameWidth) {
				if (
					Math.abs(centerXMoving - centerXItem) < this.alignThreshold
				) {
					const line = new Line(
						new Point(
							centerXItem,
							Math.max(itemMbr.top, movingMBR.top),
						),
						new Point(
							centerXItem,
							Math.min(itemMbr.bottom, movingMBR.bottom),
						),
					);
					line.isCenter = true;
					verticalLines.push(line);
				}
			}

			if (!isSameHeight) {
				if (
					Math.abs(centerYMoving - centerYItem) < this.alignThreshold
				) {
					const line = new Line(
						new Point(
							Math.max(itemMbr.left, movingMBR.left),
							centerYItem,
						),
						new Point(
							Math.min(itemMbr.right, movingMBR.right),
							centerYItem,
						),
					);
					line.isCenter = true;
					horizontalLines.push(line);
				}
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
		cursorPosition: Point,
	): boolean {
		const itemMbr = draggingItem.getMbr();
		const itemCenterX = (itemMbr.left + itemMbr.right) / 2;
		const itemCenterY = (itemMbr.top + itemMbr.bottom) / 2;
		let snapped = false;

		const snapToLine = (lines: Line[], isVertical: boolean) => {
			for (const line of lines) {
				if (!line) {
					return false;
				}

				if (isVertical) {
					if (
						Math.abs(itemMbr.left - line.start.x) <
						this.snapThreshold
					) {
						draggingItem.transformation.translateBy(
							line.start.x - itemMbr.left,
							0,
							beginTimeStamp,
						);
						this.snapMemory.x = cursorPosition.x;
						snapped = true;
						break;
					} else if (
						Math.abs(itemMbr.right - line.start.x) <
						this.snapThreshold
					) {
						draggingItem.transformation.translateBy(
							line.start.x - itemMbr.right,
							0,
							beginTimeStamp,
						);
						this.snapMemory.x = cursorPosition.x;
						snapped = true;
						break;
					} else if (
						Math.abs(itemCenterX - line.start.x) <
						this.snapThreshold
					) {
						draggingItem.transformation.translateBy(
							line.start.x - itemCenterX,
							0,
							beginTimeStamp,
						);
						this.snapMemory.x = cursorPosition.x;
						snapped = true;
						break;
					} else if (
						Math.abs(itemCenterX - line.end.x) < this.snapThreshold
					) {
						draggingItem.transformation.translateBy(
							line.end.x - itemCenterX,
							0,
							beginTimeStamp,
						);
						this.snapMemory.x = cursorPosition.x;
						snapped = true;
						break;
					}
				} else {
					if (
						Math.abs(itemMbr.top - line.start.y) <
						this.snapThreshold
					) {
						draggingItem.transformation.translateBy(
							0,
							line.start.y - itemMbr.top,
							beginTimeStamp,
						);
						this.snapMemory.y = cursorPosition.y;
						snapped = true;
						break;
					} else if (
						Math.abs(itemMbr.bottom - line.start.y) <
						this.snapThreshold
					) {
						draggingItem.transformation.translateBy(
							0,
							line.start.y - itemMbr.bottom,
							beginTimeStamp,
						);
						this.snapMemory.y = cursorPosition.y;
						snapped = true;
						break;
					} else if (
						Math.abs(itemCenterY - line.start.y) <
						this.snapThreshold
					) {
						draggingItem.transformation.translateBy(
							0,
							line.start.y - itemCenterY,
							beginTimeStamp,
						);
						this.snapMemory.y = cursorPosition.y;
						snapped = true;
						break;
					} else if (
						Math.abs(itemCenterY - line.end.y) < this.snapThreshold
					) {
						draggingItem.transformation.translateBy(
							0,
							line.end.y - itemCenterY,
							beginTimeStamp,
						);
						this.snapMemory.y = cursorPosition.y;
						snapped = true;
						break;
					}
				}
			}
			return snapped;
		};

		const snappedToVertical = snapToLine(snapLines.verticalLines, true);
		const snappedToHorizontal = snapToLine(
			snapLines.horizontalLines,
			false,
		);

		if (
			this.snapMemory.x !== null &&
			Math.abs(cursorPosition.x - this.snapMemory.x) > 10
		) {
			this.snapMemory.x = null;
		}
		if (
			this.snapMemory.y !== null &&
			Math.abs(cursorPosition.y - this.snapMemory.y) > 10
		) {
			this.snapMemory.y = null;
		}

		return snappedToVertical || snappedToHorizontal;
	}

	renderSnapLines(
		context: DrawingContext,
		snapLines: { verticalLines: Line[]; horizontalLines: Line[] },
		scale: number,
	): void {
		context.ctx.save();
		const zoom = scale * 100;
		const lineWidth = this.calculateLineThickness(zoom);
		context.ctx.lineWidth = lineWidth;

		const offset = 10;
		const perpendicularLength = 5;
		snapLines.verticalLines.forEach(line => {
			if (line.isCenter) {
				context.ctx.strokeStyle = "rgba(0, 0, 255, 1)";
				context.ctx.setLineDash([]);
				context.ctx.beginPath();
				context.ctx.moveTo(line.start.x, line.start.y - offset);
				context.ctx.lineTo(line.end.x, line.end.y + offset);
				context.ctx.stroke();

				context.ctx.beginPath();
				context.ctx.moveTo(
					line.start.x - perpendicularLength,
					line.start.y - offset,
				);
				context.ctx.lineTo(
					line.start.x + perpendicularLength,
					line.start.y - offset,
				);
				context.ctx.moveTo(
					line.end.x - perpendicularLength,
					line.end.y + offset,
				);
				context.ctx.lineTo(
					line.end.x + perpendicularLength,
					line.end.y + offset,
				);
				context.ctx.stroke();
			} else {
				context.ctx.strokeStyle = "rgba(0, 0, 255, 1)";
				context.ctx.setLineDash([5, 5]);
				context.ctx.beginPath();
				context.ctx.moveTo(line.start.x, line.start.y);
				context.ctx.lineTo(line.end.x, line.end.y);
				context.ctx.stroke();
			}
		});

		snapLines.horizontalLines.forEach(line => {
			if (line.isCenter) {
				context.ctx.strokeStyle = "rgba(0, 0, 255, 1)";
				context.ctx.setLineDash([]);
				context.ctx.beginPath();
				context.ctx.moveTo(line.start.x - offset, line.start.y);
				context.ctx.lineTo(line.end.x + offset, line.end.y);
				context.ctx.stroke();

				context.ctx.beginPath();
				context.ctx.moveTo(
					line.start.x - offset,
					line.start.y - perpendicularLength,
				);
				context.ctx.lineTo(
					line.start.x - offset,
					line.start.y + perpendicularLength,
				);
				context.ctx.moveTo(
					line.end.x + offset,
					line.end.y - perpendicularLength,
				);
				context.ctx.lineTo(
					line.end.x + offset,
					line.end.y + perpendicularLength,
				);
				context.ctx.stroke();
			} else {
				context.ctx.strokeStyle = "rgba(0, 0, 255, 1)";
				context.ctx.setLineDash([5, 5]);
				context.ctx.beginPath();
				context.ctx.moveTo(line.start.x, line.start.y);
				context.ctx.lineTo(line.end.x, line.end.y);
				context.ctx.stroke();
			}
		});

		context.ctx.restore();
	}
}
