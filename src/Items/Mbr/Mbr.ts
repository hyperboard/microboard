import { forceNumberIntoInterval, toFiniteNumber } from "Board/lib";
import { Point } from "../Point";
import { Line } from "../Line";
import { Matrix } from "../Transformation";
import { VerticalAlignment } from "Board/Items/Alignment";
import { DrawingContext } from "Board/Items/DrawingContext";
import {
	getIntersectionPointFromIntersectingLines,
	getLinesRelationType,
} from "../Line";
import { Geometry } from "../Geometry";
import { GeometricNormal } from "../GeometricNormal";
import { BorderStyle } from "../Path";
import { RichText } from "..";

/**
 * The minimum bounding rectangle (MBR), also known as bounding box (BBOX) or envelope.
 * https://en.wikipedia.org/wiki/Minimum_bounding_rectangle
 */
export class Mbr implements Geometry {
	static fromDomRect(rect: DOMRect): Mbr {
		return new Mbr(rect.left, rect.top, rect.right, rect.bottom);
	}

	constructor(
		public left = 0,
		public top = 0,
		public right = 0,
		public bottom = 0,
		public borderColor = "black",
		public backgroundColor = "none",
		public strokeWidth = 1,
		public borderStyle: BorderStyle = "solid",
	) {
		this.left = toFiniteNumber(left);
		this.top = toFiniteNumber(top);
		this.right = toFiniteNumber(right);
		this.bottom = toFiniteNumber(bottom);
		this.updatePath();
	}

	getWidth(): number {
		return this.right - this.left;
	}

	getHeight(): number {
		return this.bottom - this.top;
	}

	getCenter(): Point {
		return new Point(
			this.left + (this.right - this.left) / 2,
			this.top + (this.bottom - this.top) / 2,
		);
	}

	getHypotenuse(): number {
		const width = this.getWidth();
		const height = this.getHeight();
		return Math.sqrt(width * width + height * height);
	}

	getSin(): number {
		return Math.abs(this.getHeight() / this.getHypotenuse());
	}

	getCos(): number {
		return Math.abs(this.getWidth() / this.getHypotenuse());
	}

	moveLeftTop(position: Point): void {
		const { x, y } = position;
		const deltaX = this.left - x;
		const deltaY = this.top - y;
		this.left -= deltaX;
		this.top -= deltaY;
		this.right -= deltaX;
		this.bottom -= deltaY;
	}

	scaleFromCenter(matrix: Matrix): void {
		const { scaleX, scaleY } = matrix;
		this.left *= scaleX;
		this.top *= scaleY;
		this.right *= scaleX;
		this.bottom *= scaleY;
	}

	scaleFromLeftTop(matrix: Matrix): void {
		this.right = this.left + this.getWidth() * matrix.scaleX;
		this.bottom = this.top + this.getHeight() * matrix.scaleY;
	}

	alignInRectangle(rect: Mbr, alignment: VerticalAlignment): void {
		const width = this.getWidth();
		const height = this.getHeight();
		const center = rect.getCenter();
		const left = center.x - width / 2;
		const top =
			alignment === "top"
				? rect.top
				: alignment === "bottom"
					? rect.bottom - height
					: center.y - height / 2;
		this.left = Math.max(left, rect.left);
		this.top = Math.max(top, rect.top);
		this.right = left + width;
		this.bottom = top + height;
	}

	addMbr(mbr: Mbr): void {
		const { left, top, right, bottom } = mbr;
		if (this.left > left) {
			this.left = left;
		}
		if (this.top > top) {
			this.top = top;
		}
		if (this.right < right) {
			this.right = right;
		}
		if (this.bottom < bottom) {
			this.bottom = bottom;
		}
	}

	combine(mbrs: Mbr | Mbr[]): Mbr {
		if (Array.isArray(mbrs)) {
			for (const mbr of mbrs) {
				this.addMbr(mbr);
			}
		} else {
			this.addMbr(mbrs);
		}
		return this;
	}

	transform(matrix: Matrix): void {
		const { left, top, right, bottom } = this;
		const min = new Point(left, top);
		const max = new Point(right, bottom);
		min.transform(matrix);
		max.transform(matrix);
		this.left = min.x;
		this.top = min.y;
		this.right = max.x;
		this.bottom = max.y;
		this.updatePath();
	}

	getTransformed(matrix: Matrix): Mbr {
		const { left, top, right, bottom } = this;
		const min = new Point(left, top);
		const max = new Point(right, bottom);
		min.transform(matrix);
		max.transform(matrix);
		return new Mbr(min.x, min.y, max.x, max.y);
	}

	copy(): Mbr {
		return new Mbr(this.left, this.top, this.right, this.bottom);
	}

	getLines(): Line[] {
		const { left, top, right, bottom } = this;
		return [
			new Line(new Point(left, top), new Point(right, top)),
			new Line(new Point(left, bottom), new Point(right, bottom)),
			new Line(new Point(right, top), new Point(right, bottom)),
			new Line(new Point(left, top), new Point(left, bottom)),
		];
	}

	// getPath(): Path {
	// 	return new Path(this.getLines(), true);
	// }

	getSnapAnchorPoints(): Point[] {
		const mbr = this;
		const width = mbr.getWidth();
		const height = mbr.getHeight();
		return [
			new Point(mbr.left + width / 2, mbr.top),
			new Point(mbr.left + width / 2, mbr.bottom),
			new Point(mbr.left, mbr.top + height / 2),
			new Point(mbr.right, mbr.top + height / 2),
		];
	}

	getNearestPointInside(point: Point): Point {
		const { x, y } = point;
		const { left, top, right, bottom } = this;
		return new Point(
			forceNumberIntoInterval(x, left, right),
			forceNumberIntoInterval(y, top, bottom),
		);
	}

	getNearestPointOnPerimeter(point: Point, orCenter: boolean): Point {
		const { x, y } = this.getNearestPointInside(point);
		const { left, top, right, bottom } = this;
		const toLeft = Math.abs(x - left);
		const toTop = Math.abs(y - top);
		const toRight = Math.abs(x - right);
		const toBottom = Math.abs(y - bottom);
		const center = this.getCenter();
		const toCenter = orCenter
			? Math.min(Math.abs(x - center.x), Math.abs(y - center.y))
			: Number.MAX_VALUE;
		switch (Math.min(toLeft, toTop, toRight, toBottom, toCenter)) {
			case toLeft:
				return new Point(left, y);
			case toTop:
				return new Point(x, top);
			case toRight:
				return new Point(right, y);
			case toBottom:
				return new Point(x, bottom);
			case toCenter:
			default:
				return center;
		}
	}

	getClosestEdgeCenterPoint(point: Point): Point {
		const nearestPoint = this.getNearestPointOnPerimeter(point, false);
		const { left, top, right, bottom } = this;
		const itemWidthCenter = left + this.getWidth() / 2;
		const itemHeightCenter = top + this.getHeight() / 2;

		const distances = {
			left: Math.abs(nearestPoint.x - left),
			top: Math.abs(nearestPoint.y - top),
			right: Math.abs(nearestPoint.x - right),
			bottom: Math.abs(nearestPoint.y - bottom),
		};

		const minDistance = Math.min(...Object.values(distances));

		switch (minDistance) {
			case distances.top:
			case distances.bottom:
				return new Point(itemWidthCenter, nearestPoint.y);
			case distances.right:
			case distances.left:
				return new Point(nearestPoint.x, itemHeightCenter);
			default:
				return nearestPoint;
		}
	}

	isInside(point: Point): boolean {
		const { x, y } = point;
		const { left, top, right, bottom } = this;
		return x >= left && x <= right && y >= top && y <= bottom;
	}

	isAlmostInside(point: Point, diff: number): boolean {
		const { x, y } = point;
		const { left, top, right, bottom } = this;
		return (
			x + diff >= left &&
			x - diff <= right &&
			y + diff >= top &&
			y - diff <= bottom
		);
	}

	isEqual(mbr: Mbr): boolean {
		return (
			this.left === mbr.left &&
			this.top === mbr.top &&
			this.right === mbr.right &&
			this.bottom === mbr.bottom
		);
	}

	isNotCrossedBy(rect: Mbr): boolean {
		return (
			this.right < rect.left ||
			this.left > rect.right ||
			this.bottom < rect.top ||
			this.top > rect.bottom
		);
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		return !this.isNotCrossedBy(rect);
	}

	isInView(rect: Mbr): boolean {
		return this.isEnclosedOrCrossedBy(rect);
	}

	isEnclosedBy(rect: Mbr): boolean {
		return (
			this.left > rect.left &&
			this.top > rect.top &&
			this.right < rect.right &&
			this.bottom < rect.bottom
		);
	}

	getIntersectionPoints(segment: Line): Point[] {
		const points: Point[] = [];
		for (const line of this.getLines()) {
			const relation = getLinesRelationType(segment, line);
			if (relation.type === "Intersecting") {
				points.push(
					getIntersectionPointFromIntersectingLines(relation),
				);
			}
		}
		return points;
	}

	getMbr(): Mbr {
		return new Mbr(this.left, this.top, this.right, this.bottom);
	}

	isClosed(): boolean {
		return true;
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.getNearestPointOnPerimeter(point, false);
	}

	getDistanceToPoint(point: Point): number {
		const nearest = this.getNearestEdgePointTo(point);
		return point.getDistance(nearest);
	}

	isUnderPoint(point: Point): boolean {
		return (
			point.x >= this.left &&
			point.x <= this.right &&
			this.top <= point.y &&
			this.bottom >= point.y
		);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return distance > this.getDistanceToPoint(point);
	}

	getNormal(point: Point): GeometricNormal {
		const pointOnLine = this.getNearestEdgePointTo(point);

		const isOnTop = pointOnLine.y === this.top;
		const isOnBottom = pointOnLine.y === this.bottom;
		const isOnLeft = pointOnLine.x === this.left;

		let start: Point;
		let end: Point;
		if (isOnTop || isOnBottom) {
			start = new Point(this.left, pointOnLine.y);
			end = new Point(this.right, pointOnLine.y);
		} else {
			start = new Point(pointOnLine.x, this.top);
			end = new Point(pointOnLine.x, this.bottom);
		}

		const dirX = end.x - start.x;
		const dirY = end.y - start.y;
		const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);

		const normalX = (isOnLeft ? dirY : -dirY) / magnitude;
		const normalY = (isOnBottom ? -dirX : dirX) / magnitude;

		const normal = new Point(normalX, normalY);
		return new GeometricNormal(point, pointOnLine, normal);
	}

	updatePath(): void {
		/*
		this.path = new (conf.path2DFactory)();
		this.path.rect(this.left, this.top, this.getWidth(), this.getHeight());
		*/
	}

	getRichText(): RichText | null {
		return null;
	}

	render(context: DrawingContext): void {
		const { ctx } = context;
		if (this.backgroundColor !== "none") {
			ctx.fillStyle = this.backgroundColor;
			ctx.fillRect(
				this.left,
				this.top,
				this.getWidth(),
				this.getHeight(),
			);
		}

		if (this.strokeWidth) {
			ctx.strokeStyle = this.borderColor;
			ctx.lineWidth = this.strokeWidth;
			ctx.setLineDash([]);
			ctx.strokeRect(
				this.left,
				this.top,
				this.getWidth(),
				this.getHeight(),
			);
		}
	}
}
