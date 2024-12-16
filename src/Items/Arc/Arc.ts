import { Point, Line, Mbr, Matrix } from "..";
import { GeometricNormal } from "../GeometricNormal";

function getArcIntersectionPoints(segment: Line, arc: Arc): Point[] {
	const centerX = arc.center.x;
	const centerY = arc.center.y;
	const radiusX = arc.radiusX;
	const radiusY = arc.radiusY;
	const startAngle = arc.startAngle;
	const endAngle = arc.endAngle;
	const x1 = segment.start.x;
	const y1 = segment.start.y;
	const x2 = segment.end.x;
	const y2 = segment.end.y;

	const dx = x2 - x1;
	const dy = y2 - y1;

	const a = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
	const b =
		2 *
		(((x1 - centerX) * dx) / (radiusX * radiusX) +
			((y1 - centerY) * dy) / (radiusY * radiusY));
	const c =
		((x1 - centerX) * (x1 - centerX)) / (radiusX * radiusX) +
		((y1 - centerY) * (y1 - centerY)) / (radiusY * radiusY) -
		1;

	const discriminant = b * b - 4 * a * c;

	if (discriminant < 0) {
		return []; // No intersection
	}

	const sqrtDiscriminant = Math.sqrt(discriminant);
	const t1 = (-b + sqrtDiscriminant) / (2 * a);
	const t2 = (-b - sqrtDiscriminant) / (2 * a);

	const points: Point[] = [];

	if (t1 >= 0 && t1 <= 1) {
		const point1 = new Point(x1 + t1 * dx, y1 + t1 * dy);
		const angle1 = Math.atan2(point1.y - centerY, point1.x - centerX);
		if (angle1 >= startAngle && angle1 <= endAngle) {
			points.push(point1);
		}
	}
	if (t2 >= 0 && t2 <= 1) {
		const point2 = new Point(x1 + t2 * dx, y1 + t2 * dy);
		const angle2 = Math.atan2(point2.y - centerY, point2.x - centerX);
		if (angle2 >= startAngle && angle2 <= endAngle) {
			points.push(point2);
		}
	}

	return points;
}

export class ArcData {}

// See https://stackoverflow.com/questions/6729056/mapping-svg-arcto-to-html-canvas-arcto
// TODO
export class Arc {
	type = "Arc" as const;
	rotation = 0;

	constructor(
		public center = new Point(),
		public radiusX = 0,
		public radiusY = 0,
		public startAngle = 0,
		public endAngle = 0,
		public clockwise = false,
	) {}

	getLength(): number {
		// Approximate the circumference of the ellipse using Ramanujan's formula
		const h =
			Math.pow(this.radiusX - this.radiusY, 2) /
			Math.pow(this.radiusX + this.radiusY, 2);
		const circumference =
			Math.PI *
			(this.radiusX + this.radiusY) *
			(1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
		const angle = Math.abs(this.endAngle - this.startAngle);
		return (circumference * angle) / (2 * Math.PI);
	}

	getNearestPointParameter(point: Point): number {
		const { x, y } = point;
		const { center, radiusX, radiusY, rotation } = this;
		const dx = x - center.x;
		const dy = y - center.y;

		// Transform the point to the ellipse's local coordinate system
		const localX = Math.cos(rotation) * dx + Math.sin(rotation) * dy;
		const localY = -Math.sin(rotation) * dx + Math.cos(rotation) * dy;

		const angle = Math.atan2(localY / radiusY, localX / radiusX);
		const startAngle = this.startAngle;
		const endAngle = this.endAngle;
		let parameter = (angle - startAngle) / (endAngle - startAngle);
		if (parameter < 0) {
			parameter = 0;
		} else if (parameter > 1) {
			parameter = 1;
		}
		return parameter;
	}

	getPoint(parameter: number): Point {
		const { center, radiusX, radiusY, startAngle, endAngle, rotation } =
			this;
		const angle = startAngle + parameter * (endAngle - startAngle);
		const localX = radiusX * Math.cos(angle);
		const localY = radiusY * Math.sin(angle);

		// Transform the point back to the global coordinate system
		const x =
			center.x +
			Math.cos(rotation) * localX -
			Math.sin(rotation) * localY;
		const y =
			center.y +
			Math.sin(rotation) * localX +
			Math.cos(rotation) * localY;
		return new Point(x, y);
	}

	getStartPoint(): Point {
		const x = this.center.x + this.radiusX * Math.cos(this.startAngle);
		const y = this.center.y + this.radiusY * Math.sin(this.startAngle);
		return new Point(x, y);
	}

	getPointByTangent(tangent: number): Point {
		return this.getPoint(tangent);
	}

	getTangentByPoint(point: Point): number {
		const tangent = this.getNearestPointParameter(point);
		return tangent;
	}

	getCenterPoint(): Point {
		return this.center.copy();
	}

	getNearestPointOnArc(point: Point): Point {
		const arcParameter = this.getNearestPointParameter(point);
		return this.getPoint(arcParameter);
	}

	getIntersectionPoints(segment: Line): Point[] {
		return getArcIntersectionPoints(segment, this);
	}

	getDistance(point: Point): number {
		const nearest = this.getNearestPointOnArc(point);
		const distance = nearest.getDistance(point);
		return distance;
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.getNearestPointOnArc(point);
	}

	getMbr(): Mbr {
		const { center, radiusX, radiusY } = this;
		return new Mbr(
			center.x - radiusX,
			center.y - radiusY,
			center.x + radiusX,
			center.y + radiusY,
		);
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		for (const line of rect.getLines()) {
			if (getArcIntersectionPoints(line, this).length) {
				return true;
			}
		}
		return !this.getMbr().isEnclosedBy(rect);
	}

	isUnderPoint(point: Point) {
		return this.getMbr().isUnderPoint(point);
	}

	getNormal(point: Point): GeometricNormal {
		const nearest = this.getNearestEdgePointTo(point);

		const dirX = nearest.x - this.center.x;
		const dirY = nearest.y - this.center.y;
		const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);

		const normalX = -dirY / magnitude;
		const normalY = dirX / magnitude;

		const normalPoint = new Point(normalX, normalY);

		return new GeometricNormal(point, nearest, normalPoint);
	}

	moveToStart(ctx: Path2D | CanvasRenderingContext2D): void {
		ctx.moveTo(
			this.center.x +
				this.radiusX *
					Math.cos(this.startAngle) *
					Math.cos(this.rotation) -
				this.radiusY *
					Math.sin(this.startAngle) *
					Math.sin(this.rotation),
			this.center.y +
				this.radiusX *
					Math.cos(this.startAngle) *
					Math.sin(this.rotation) +
				this.radiusY *
					Math.sin(this.startAngle) *
					Math.cos(this.rotation),
		);
	}

	render(ctx: Path2D | CanvasRenderingContext2D): void {
		ctx.ellipse(
			this.center.x,
			this.center.y,
			this.radiusX,
			this.radiusY,
			this.rotation,
			this.startAngle,
			this.endAngle,
			this.clockwise,
		);
	}

	transform(matrix: Matrix): void {
		this.center.transform(matrix);
		this.radiusX = this.radiusX * matrix.scaleX;
		this.radiusY = this.radiusY * matrix.scaleY;
	}

	getTransformed(matrix: Matrix): Arc {
		return new Arc(
			this.center.getTransformed(matrix),
			this.radiusX * matrix.scaleX,
			this.radiusY * matrix.scaleY,
			this.startAngle,
			this.endAngle,
			this.clockwise,
		);
	}

	copy(): Arc {
		return new Arc(
			this.center.copy(),
			this.radiusX,
			this.radiusY,
			this.startAngle,
			this.endAngle,
			this.clockwise,
		);
	}
}
