import { Board } from "Board/Board";
import { Item, Line, Point } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { SpatialIndex } from "Board/SpatialIndex";

export class AlignmentHelper {
	private alignThreshold = 2;
	private snapMemory: { x: number | null; y: number | null } = {
		x: null,
		y: null,
	};
	board: Board;
	snapThreshold = 2;

	constructor(
		board: Board,
		private spatialIndex: SpatialIndex,
	) {
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
		const cameraWidth = camera.getWidth();
		const scale = this.board.camera.getScale();
		const dynamicAlignThreshold = Math.min(this.alignThreshold / scale, 8);
		const nearbyItems = this.spatialIndex.getNearestTo(
			movingMBR.getCenter(),
			20,
			(otherItem: Item) =>
				otherItem !== movingMBR &&
				otherItem.itemType !== "Connector" &&
				otherItem.itemType !== "Drawing" &&
				otherItem.isInView(camera),
			cameraWidth,
		);

		const verticalAlignments: Map<number, { minY: number; maxY: number }> =
			new Map();
		const horizontalAlignments: Map<
			number,
			{ minX: number; maxX: number }
		> = new Map();

		const addVerticalAlignment = (
			x: number,
			minY: number,
			maxY: number,
		) => {
			if (verticalAlignments.has(x)) {
				const alignment = verticalAlignments.get(x)!;
				alignment.minY = Math.min(alignment.minY, minY);
				alignment.maxY = Math.max(alignment.maxY, maxY);
			} else {
				verticalAlignments.set(x, { minY, maxY });
			}
		};

		const addHorizontalAlignment = (
			y: number,
			minX: number,
			maxX: number,
		) => {
			if (horizontalAlignments.has(y)) {
				const alignment = horizontalAlignments.get(y)!;
				alignment.minX = Math.min(alignment.minX, minX);
				alignment.maxX = Math.max(alignment.maxX, maxX);
			} else {
				horizontalAlignments.set(y, { minX, maxX });
			}
		};

		nearbyItems.forEach(item => {
			if (item === movingItem) {
				return;
			}
			const itemMbr =
				item.itemType === "Shape"
					? item.getPath().getMbr()
					: item.getMbr();

			const centerXMoving = (movingMBR.left + movingMBR.right) / 2;
			const centerXItem = (itemMbr.left + itemMbr.right) / 2;

			const centerYMoving = (movingMBR.top + movingMBR.bottom) / 2;
			const centerYItem = (itemMbr.top + itemMbr.bottom) / 2;
			const epsilon = 0.0001;
			const isSameWidth =
				Math.abs(movingMBR.getWidth() - itemMbr.getWidth()) < epsilon;
			const isSameHeight =
				Math.abs(movingMBR.getHeight() - itemMbr.getHeight()) < epsilon;

			if (
				Math.abs(centerXMoving - centerXItem) < dynamicAlignThreshold &&
				!isSameWidth
			) {
				addVerticalAlignment(
					centerXItem,
					Math.min(itemMbr.top, movingMBR.top),
					Math.max(itemMbr.bottom, movingMBR.bottom),
				);
			}
			if (
				Math.abs(itemMbr.left - movingMBR.left) < dynamicAlignThreshold
			) {
				addVerticalAlignment(
					itemMbr.left,
					Math.min(itemMbr.top, movingMBR.top),
					Math.max(itemMbr.bottom, movingMBR.bottom),
				);
			}
			if (
				Math.abs(itemMbr.right - movingMBR.right) <
				dynamicAlignThreshold
			) {
				addVerticalAlignment(
					itemMbr.right,
					Math.min(itemMbr.top, movingMBR.top),
					Math.max(itemMbr.bottom, movingMBR.bottom),
				);
			}
			if (
				Math.abs(itemMbr.left - movingMBR.right) < dynamicAlignThreshold
			) {
				addVerticalAlignment(
					itemMbr.left,
					Math.min(itemMbr.top, movingMBR.top),
					Math.max(itemMbr.bottom, movingMBR.bottom),
				);
			}
			if (
				Math.abs(itemMbr.right - movingMBR.left) < dynamicAlignThreshold
			) {
				addVerticalAlignment(
					itemMbr.right,
					Math.min(itemMbr.top, movingMBR.top),
					Math.max(itemMbr.bottom, movingMBR.bottom),
				);
			}

			if (
				Math.abs(centerYMoving - centerYItem) < dynamicAlignThreshold &&
				!isSameHeight
			) {
				addHorizontalAlignment(
					centerYItem,
					Math.min(itemMbr.left, movingMBR.left),
					Math.max(itemMbr.right, movingMBR.right),
				);
			}
			if (Math.abs(itemMbr.top - movingMBR.top) < dynamicAlignThreshold) {
				addHorizontalAlignment(
					itemMbr.top,
					Math.min(itemMbr.left, movingMBR.left),
					Math.max(itemMbr.right, movingMBR.right),
				);
			}
			if (
				Math.abs(itemMbr.bottom - movingMBR.bottom) <
				dynamicAlignThreshold
			) {
				addHorizontalAlignment(
					itemMbr.bottom,
					Math.min(itemMbr.left, movingMBR.left),
					Math.max(itemMbr.right, movingMBR.right),
				);
			}
			if (
				Math.abs(itemMbr.top - movingMBR.bottom) < dynamicAlignThreshold
			) {
				addHorizontalAlignment(
					itemMbr.top,
					Math.min(itemMbr.left, movingMBR.left),
					Math.max(itemMbr.right, movingMBR.right),
				);
			}
			if (
				Math.abs(itemMbr.bottom - movingMBR.top) < dynamicAlignThreshold
			) {
				addHorizontalAlignment(
					itemMbr.bottom,
					Math.min(itemMbr.left, movingMBR.left),
					Math.max(itemMbr.right, movingMBR.right),
				);
			}
		});

		const verticalLines = Array.from(verticalAlignments.entries())
			.map(
				([x, range]) =>
					new Line(
						new Point(x, range.minY),
						new Point(x, range.maxY),
					),
			)
			.filter((line, index, lines) => {
				const mainLine = lines[0];
				return (
					index === 0 ||
					Math.abs(line.start.x - mainLine.start.x) >= 20
				);
			});

		const horizontalLines = Array.from(horizontalAlignments.entries())
			.map(
				([y, range]) =>
					new Line(
						new Point(range.minX, y),
						new Point(range.maxX, y),
					),
			)
			.filter((line, index, lines) => {
				const mainLine = lines[0];
				return (
					index === 0 ||
					Math.abs(line.start.y - mainLine.start.y) >= 20
				);
			});

		console.log("horizontalLines", horizontalLines);
		console.log("verticalLines", verticalLines);

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

		const scale = this.board.camera.getScale();
		const dynamicSnapThreshold = Math.min(this.snapThreshold / scale, 8);

		const snapToLine = (lines: Line[], isVertical: boolean) => {
			for (const line of lines) {
				if (!line) {
					return false;
				}

				const snapOffset = isVertical ? line.start.x : line.start.y;
				const itemOffset = isVertical ? itemMbr.left : itemMbr.top;
				const itemSize = isVertical
					? itemMbr.getWidth()
					: itemMbr.getHeight();
				const itemCenter = isVertical ? itemCenterX : itemCenterY;

				if (Math.abs(itemOffset - snapOffset) < dynamicSnapThreshold) {
					draggingItem.transformation.translateBy(
						isVertical ? snapOffset - itemOffset : 0,
						isVertical ? 0 : snapOffset - itemOffset,
						beginTimeStamp,
					);
					this.snapMemory[isVertical ? "x" : "y"] =
						cursorPosition[isVertical ? "x" : "y"];
					snapped = true;
					break;
				} else if (
					Math.abs(itemOffset + itemSize - snapOffset) <
					dynamicSnapThreshold
				) {
					draggingItem.transformation.translateBy(
						isVertical ? snapOffset - (itemOffset + itemSize) : 0,
						isVertical ? 0 : snapOffset - (itemOffset + itemSize),
						beginTimeStamp,
					);
					this.snapMemory[isVertical ? "x" : "y"] =
						cursorPosition[isVertical ? "x" : "y"];
					snapped = true;
					break;
				} else if (
					Math.abs(itemCenter - snapOffset) < dynamicSnapThreshold
				) {
					draggingItem.transformation.translateBy(
						isVertical ? snapOffset - itemCenter : 0,
						isVertical ? 0 : snapOffset - itemCenter,
						beginTimeStamp,
					);
					this.snapMemory[isVertical ? "x" : "y"] =
						cursorPosition[isVertical ? "x" : "y"];
					snapped = true;
					break;
				}
			}
			return snapped;
		};

		if (
			this.snapMemory.x !== null &&
			Math.abs(cursorPosition.x - this.snapMemory.x) >
				dynamicSnapThreshold
		) {
			this.snapMemory.x = null;
		}
		if (
			this.snapMemory.y !== null &&
			Math.abs(cursorPosition.y - this.snapMemory.y) >
				dynamicSnapThreshold
		) {
			this.snapMemory.y = null;
		}

		const snappedToVertical = snapToLine(snapLines.verticalLines, true);
		const snappedToHorizontal = snapToLine(
			snapLines.horizontalLines,
			false,
		);

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

		snapLines.verticalLines.forEach(line => {
			context.ctx.strokeStyle = "rgba(0, 0, 255, 1)";
			context.ctx.setLineDash([5, 5]);
			context.ctx.beginPath();
			context.ctx.moveTo(line.start.x, line.start.y);
			context.ctx.lineTo(line.end.x, line.end.y);
			context.ctx.stroke();
		});

		snapLines.horizontalLines.forEach(line => {
			context.ctx.strokeStyle = "rgba(0, 0, 255, 1)";
			context.ctx.setLineDash([5, 5]);
			context.ctx.beginPath();
			context.ctx.moveTo(line.start.x, line.start.y);
			context.ctx.lineTo(line.end.x, line.end.y);
			context.ctx.stroke();
		});

		context.ctx.restore();
	}
}
