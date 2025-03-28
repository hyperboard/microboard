import { Point } from "../Point";
import { Item } from "../Item";
import { Connector } from "./Connector";
import { Matrix } from "../Transformation";
import { RichText } from "../RichText";
import { AINode } from "../AINode";

type Edge = "top" | "bottom" | "left" | "right";

export interface BoardPointData {
	pointType: "Board";
	x: number;
	y: number;
}

interface FloatingPointData {
	pointType: "Floating";
	itemId: string;
	relativeX: number;
	relativeY: number;
}

interface FixedPointData {
	pointType: "Fixed";
	itemId: string;
	relativeX: number;
	relativeY: number;
}

interface FixedConnectorPointData {
	pointType: "FixedConnector";
	itemId: string;
	tangent: number;
	segment: number; // segment index
}

export type ControlPointData =
	| BoardPointData
	| FloatingPointData
	| FixedPointData
	| FixedConnectorPointData;

export class BoardPoint extends Point {
	readonly pointType = "Board";

	serialize(): BoardPointData {
		return {
			pointType: "Board",
			x: this.x,
			y: this.y,
		};
	}

	equal(controlPoint: ControlPoint): boolean {
		if (controlPoint.pointType === this.pointType) {
			return super.equal(controlPoint);
		}
		return false;
	}
}

export class FloatingPoint extends Point {
	readonly pointType = "Floating";
	private edge: Edge | undefined;

	constructor(
		public item: Item,
		readonly relativePoint: Point,
	) {
		super();
		if (relativePoint.y <= 0) {
			this.edge = "top";
		} else if (relativePoint.y >= item.getMbr().getHeight()) {
			this.edge = "bottom";
		} else if (relativePoint.x <= 0) {
			this.edge = "left";
		} else if (relativePoint.x >= item.getMbr().getWidth()) {
			this.edge = "right";
		}
		this.recalculatePoint();
	}

	recalculatePoint(): void {
		const point = fromRelativePoint(
			this.relativePoint,
			this.item,
			this.edge,
		);
		this.x = point.x;
		this.y = point.y;
	}

	serialize(): FloatingPointData {
		return {
			pointType: "Floating",
			itemId: this.item.getId(),
			relativeX: this.relativePoint.x,
			relativeY: this.relativePoint.y,
		};
	}

	equal(controlPoint: ControlPoint): boolean {
		if (controlPoint.pointType === this.pointType) {
			return (
				this.item === controlPoint.item &&
				this.relativePoint === controlPoint.relativePoint
			);
		}
		return false;
	}
}

export class FixedPoint extends Point {
	readonly pointType = "Fixed";
	private edge: Edge | undefined;

	constructor(
		public item: Item,
		readonly relativePoint: Point,
	) {
		super();
		if (relativePoint.y <= 0) {
			this.edge = "top";
		} else if (relativePoint.y >= item.getMbr().getHeight()) {
			this.edge = "bottom";
		} else if (relativePoint.x <= 0) {
			this.edge = "left";
		} else if (relativePoint.x >= item.getMbr().getWidth()) {
			this.edge = "right";
		}
		this.recalculatePoint();
	}

	recalculatePoint(): void {
		const point = fromRelativePoint(
			this.relativePoint,
			this.item,
			this.edge,
		);
		this.x = point.x;
		this.y = point.y;
	}

	serialize(): FixedPointData {
		return {
			pointType: "Fixed",
			itemId: this.item.getId(),
			relativeX: this.relativePoint.x,
			relativeY: this.relativePoint.y,
		};
	}

	equal(controlPoint: ControlPoint): boolean {
		if (this.pointType === controlPoint.pointType) {
			return (
				this.item === controlPoint.item &&
				this.relativePoint.equal(controlPoint.relativePoint)
			);
		}
		return false;
	}
}

export class FixedConnectorPoint extends Point {
	readonly pointType = "FixedConnector";

	constructor(
		public item: Connector,
		public tangent: number,
		public segmentIndex: number,
	) {
		super();
		this.recalculatePoint();
	}

	recalculatePoint(): void {
		const item = this.item;
		const segment = item.getPaths().getSegments()[this.segmentIndex];
		const point = segment.getPoint(this.tangent);
		this.x = point.x;
		this.y = point.y;
	}

	serialize(): FixedConnectorPointData {
		return {
			pointType: "FixedConnector",
			itemId: this.item.getId(),
			tangent: this.tangent,
			segment: this.segmentIndex,
		};
	}

	equal(controlPoint: ControlPoint): boolean {
		if (controlPoint.pointType === this.pointType) {
			return (
				this.item === controlPoint.item &&
				this.tangent === controlPoint.tangent &&
				this.segmentIndex === controlPoint.segmentIndex
			);
		}
		return false;
	}
}

export type ControlPoint =
	| BoardPoint
	| FloatingPoint
	| FixedPoint
	| FixedConnectorPoint;

export type FindItemFn = (id: string) => Item | undefined;

export function getControlPoint(
	data: ControlPointData,
	findItem: FindItemFn,
): ControlPoint {
	if (data.pointType === "Board") {
		return new BoardPoint(Math.round(data.x), Math.round(data.y));
	} else {
		const item = findItem(data.itemId);

		if (!item) {
			console.warn(
				`getControlPoint(): item not found for ${data.itemId}`,
			);
			// throw new Error(
			// 	`getControlPoint(): item not found for ${data.pointType} point`,
			// );
			return new BoardPoint(0, 0);
		}

		switch (data.pointType) {
			case "FixedConnector":
				if (item.itemType === "Connector") {
					return new FixedConnectorPoint(
						item,
						data.tangent,
						data.segment,
					);
				} else {
					throw new Error(
						`getControlPoint(): item must be a connector`,
					);
				}
			case "Floating":
				return new FloatingPoint(
					item,
					new Point(data.relativeX, data.relativeY),
				);
			case "Fixed":
				return new FixedPoint(
					item,
					new Point(data.relativeX, data.relativeY),
				);
		}
	}
}

export function toRelativePoint(point: Point, item: Item): Point {
	const matrix = item.transformation?.matrix || new Matrix();
	// const mbr = item.getMbr();
	// const scaleX = (mbr.right - mbr.left) / 100;
	// const scaleY = (mbr.bottom - mbr.top) / 100;
	// const translateX = mbr.left;
	// const translateY = mbr.top;
	// const matrix = new Matrix(translateX, translateY, scaleX, scaleY);
	const inverse = matrix.getInverse();
	point = point.copy();
	point.transform(inverse);
	return point;
}

function fromRelativePoint(
	relativePoint: Point,
	item: Item,
	edge?: Edge,
): Point {
	const matrix = item.transformation?.matrix.copy() || new Matrix();
	// const mbr = item.getMbr();
	// const scaleX = item.transformation?.getScale().x || 1;
	// const scaleY = item.transformation?.getScale().y || 1;
	// const translateX = mbr.left;
	// const translateY = mbr.top;
	// const matrix = new Matrix(translateX, translateY, scaleX, scaleY);
	const point = relativePoint.copy();
	point.transform(matrix);

	// TODO fix richtext width transformation. The connector needs a modified scaleX
	if (item instanceof RichText || item instanceof AINode) {
		const itemMbr = item.getMbr();
		if (!item.getIsWidthResizing()) {
			return itemMbr.getNearestPointOnPerimeter(point, false);
		}

		const { x: centerX, y: centerY } = itemMbr.getCenter();
		switch (edge) {
			case "left":
				return new Point(itemMbr.left, centerY);
			case "right":
				return new Point(itemMbr.right, centerY);
			case "top":
				return new Point(centerX, itemMbr.top);
			case "bottom":
				return new Point(centerX, itemMbr.bottom);
			default:
				return item.getMbr().getClosestEdgeCenterPoint(point);
		}
	}

	return point;
}
