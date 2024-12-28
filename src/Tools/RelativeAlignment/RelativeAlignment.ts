import { Board } from "Board/Board";
import { Frame, Item, Line, Mbr, Point } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { SelectionItems } from "Board/Selection/SelectionItems";
import { ResizeType } from "Board/Selection/Transformer/getResizeType";
import { SpatialIndex } from "Board/SpatialIndex";
import { CanvasDrawer } from "Board/drawMbrOnCanvas";

export const RELATIVE_ALIGNMENT_COLOR = "#4778F5";

type SnapAlignment = {
	offset: number;
	itemOffset: number;
	itemSize: number;
	itemCenter: number;
};

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
		private canvasDrawer: CanvasDrawer,
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
		if (movingItem.itemType === "Comment") {
			return { verticalLines: [], horizontalLines: [] };
		}
		const movingMBR =
			movingItem.itemType === "Shape"
				? movingItem.getPath().getMbr()
				: movingItem.getMbr();

		const camera = this.board.camera.getMbr();
		const cameraWidth = camera.getWidth();
		const scale = this.board.camera.getScale();
		const dynamicAlignThreshold = Math.min(this.alignThreshold / scale, 8);

		const childrenIds =
			movingItem instanceof Frame ? movingItem.getChildrenIds() : [];

		const nearbyItems = this.spatialIndex.getNearestTo(
			movingMBR.getCenter(),
			20,
			(otherItem: Item) =>
				otherItem !== movingMBR &&
				otherItem.itemType !== "Connector" &&
				otherItem.itemType !== "Drawing" &&
				otherItem.isInView(camera) &&
				!childrenIds.includes(otherItem.getId()),
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
			if (item === movingItem || item.itemType === "Comment") {
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
			const widthDifference = Math.abs(
				movingMBR.getWidth() - itemMbr.getWidth(),
			);
			const heightDifference = Math.abs(
				movingMBR.getHeight() - itemMbr.getHeight(),
			);

			const tolerance = 0.1;

			const isSameWidth = widthDifference < tolerance;
			const isSameHeight = heightDifference < tolerance;

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
			if (
				Math.abs(centerXMoving - itemMbr.left) < dynamicAlignThreshold
			) {
				addVerticalAlignment(
					itemMbr.left,
					Math.min(itemMbr.top, movingMBR.top),
					Math.max(itemMbr.bottom, movingMBR.bottom),
				);
			}
			if (
				Math.abs(centerXMoving - itemMbr.right) < dynamicAlignThreshold
			) {
				addVerticalAlignment(
					itemMbr.right,
					Math.min(itemMbr.top, movingMBR.top),
					Math.max(itemMbr.bottom, movingMBR.bottom),
				);
			}
			if (Math.abs(centerYMoving - itemMbr.top) < dynamicAlignThreshold) {
				addHorizontalAlignment(
					itemMbr.top,
					Math.min(itemMbr.left, movingMBR.left),
					Math.max(itemMbr.right, movingMBR.right),
				);
			}
			if (
				Math.abs(centerYMoving - itemMbr.bottom) < dynamicAlignThreshold
			) {
				addHorizontalAlignment(
					itemMbr.bottom,
					Math.min(itemMbr.left, movingMBR.left),
					Math.max(itemMbr.right, movingMBR.right),
				);
			}
		});

		const precisionThreshold = 1;

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
			})
			.filter(line => {
				return (
					Math.abs(line.start.x - line.end.x) <= precisionThreshold
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
			})
			.filter(line => {
				return (
					Math.abs(line.start.y - line.end.y) <= precisionThreshold
				);
			});

		return { verticalLines, horizontalLines };
	}

	generateGuidelines(center: Point): { lines: Line[] } {
		const lines: Line[] = [];
		const length = 10000;

		const angles = [0, 45, 90, 135, 180, 225, 270, 315];

		angles.forEach(angle => {
			const radians = (angle * Math.PI) / 180;
			const endX1 = center.x + length * Math.cos(radians);
			const endY1 = center.y + length * Math.sin(radians);
			const endX2 = center.x - length * Math.cos(radians);
			const endY2 = center.y - length * Math.sin(radians);

			lines.push(
				new Line(new Point(endX1, endY1), new Point(endX2, endY2)),
			);
		});

		return { lines };
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

		const scale = this.board.camera.getScale();
		const dynamicSnapThreshold = Math.min(
			Math.max(this.snapThreshold / scale, 0.6),
			3,
		);

		const getAlignmentInfo = (
			line: Line,
			isVertical: boolean,
		): SnapAlignment => ({
			offset: isVertical ? line.start.x : line.start.y,
			itemOffset: isVertical ? itemMbr.left : itemMbr.top,
			itemSize: isVertical ? itemMbr.getWidth() : itemMbr.getHeight(),
			itemCenter: isVertical ? itemCenterX : itemCenterY,
		});

		const trySnap = (
			alignment: SnapAlignment,
			isVertical: boolean,
		): boolean => {
			const snapConditions: {
				check: number;
				translation: number;
			}[] = [
				{
					check: alignment.itemOffset - alignment.offset,
					translation: alignment.offset - alignment.itemOffset,
				},
				{
					check:
						alignment.itemOffset +
						alignment.itemSize -
						alignment.offset,
					translation:
						alignment.offset -
						(alignment.itemOffset + alignment.itemSize),
				},
				{
					check: alignment.itemCenter - alignment.offset,
					translation: alignment.offset - alignment.itemCenter,
				},
			];

			for (const { check, translation } of snapConditions) {
				if (Math.abs(check) < dynamicSnapThreshold) {
					const x = isVertical ? translation : 0;
					const y = isVertical ? 0 : translation;
					this.translateItemsOrCanvas(
						draggingItem,
						x,
						y,
						beginTimeStamp,
					);
					this.snapMemory[isVertical ? "x" : "y"] =
						cursorPosition[isVertical ? "x" : "y"];
					return true;
				}
			}
			return false;
		};

		const snapToLine = (lines: Line[], isVertical: boolean): boolean => {
			for (const line of lines) {
				if (!line) {
					continue;
				}

				const alignment = getAlignmentInfo(line, isVertical);
				if (trySnap(alignment, isVertical)) {
					return true;
				}
			}
			return false;
		};

		for (const axis of ["x", "y"] as const) {
			if (
				this.snapMemory[axis] !== null &&
				Math.abs(cursorPosition[axis] - this.snapMemory[axis]!) >
					dynamicSnapThreshold
			) {
				this.snapMemory[axis] = null;
			}
		}

		return (
			snapToLine(snapLines.verticalLines, true) ||
			snapToLine(snapLines.horizontalLines, false)
		);
	}

	snapToSide(
		draggingItem: Item,
		snapLines: { verticalLines: Line[]; horizontalLines: Line[] },
		beginTimeStamp: number,
		side: ResizeType,
	): boolean {
		const itemMbr = draggingItem.getMbr();

		const getAlignmentInfo = (line: Line, side: ResizeType) => {
			const alignments: Record<
				ResizeType,
				{ position: number; reference: number; offset: number }
			> = {
				left: {
					position: itemMbr.left,
					reference: line.start.x,
					offset: line.start.x - itemMbr.left,
				},
				right: {
					position: itemMbr.right,
					reference: line.start.x,
					offset: line.start.x - itemMbr.right,
				},
				top: {
					position: itemMbr.top,
					reference: line.start.y,
					offset: line.start.y - itemMbr.top,
				},
				bottom: {
					position: itemMbr.bottom,
					reference: line.start.y,
					offset: line.start.y - itemMbr.bottom,
				},
				leftTop: {
					position: itemMbr.left,
					reference: line.start.x,
					offset: line.start.x - itemMbr.left,
				},
				leftBottom: {
					position: itemMbr.left,
					reference: line.start.x,
					offset: line.start.x - itemMbr.left,
				},
				rightTop: {
					position: itemMbr.right,
					reference: line.start.x,
					offset: line.start.x - itemMbr.right,
				},
				rightBottom: {
					position: itemMbr.right,
					reference: line.start.x,
					offset: line.start.x - itemMbr.right,
				},
			};

			return alignments[side];
		};

		const isVerticalSide = new Set([
			"left",
			"right",
			"leftTop",
			"leftBottom",
			"rightTop",
			"rightBottom",
		]);
		const isVertical = isVerticalSide.has(side);
		const lines = isVertical
			? snapLines.verticalLines
			: snapLines.horizontalLines;

		for (const line of lines) {
			if (!line) {
				continue;
			}

			const alignment = getAlignmentInfo(line, side);

			if (
				Math.abs(alignment.position - alignment.reference) <
				this.snapThreshold
			) {
				const x = isVertical ? alignment.offset : 0;
				const y = isVertical ? 0 : alignment.offset;
				this.translateItemsOrCanvas(draggingItem, x, y, beginTimeStamp);

				return true;
			}
		}

		return false;
	}

	translateItemsOrCanvas(
		item: Item,
		x: number,
		y: number,
		timeStamp: number,
	): void {
		if (this.canvasDrawer.getLastCreatedCanvas()) {
			return;
		}
		if (item.itemType === "Frame") {
			const translation = this.board.selection.getManyItemsTranslation(
				x,
				y,
			);
			this.board.selection.transformMany(translation, timeStamp);
		} else {
			item.transformation.applyTransformMany({
				class: "Transformation",
				method: "translateBy",
				item: [item.getId()],
				x,
				y,
			});
		}
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
			context.ctx.strokeStyle = RELATIVE_ALIGNMENT_COLOR;
			context.ctx.setLineDash([5, 5]);
			context.ctx.beginPath();
			context.ctx.moveTo(line.start.x, line.start.y);
			context.ctx.lineTo(line.end.x, line.end.y);
			context.ctx.stroke();
		});

		snapLines.horizontalLines.forEach(line => {
			context.ctx.strokeStyle = RELATIVE_ALIGNMENT_COLOR;
			context.ctx.setLineDash([5, 5]);
			context.ctx.beginPath();
			context.ctx.moveTo(line.start.x, line.start.y);
			context.ctx.lineTo(line.end.x, line.end.y);
			context.ctx.stroke();
		});

		context.ctx.restore();
	}
}
