import { forceNumberIntoInterval } from "utils";
import { Point } from "../Point";
import { Mbr } from "../Mbr";
import { Matrix } from "../Transformation";
import { GeometricNormal } from "../GeometricNormal";

interface RelationBase {
	lineA: Line;
	lineB: Line;
	denominator: number;
	parameterA: number;
	parameterB: number;
}

interface NonIntersectingLines extends RelationBase {
	type: "NonIntersecting";
}

interface IntersectingLines extends RelationBase {
	type: "Intersecting";
}

interface ParallelLines extends RelationBase {
	type: "Parallel";
}

interface ColenearLines extends RelationBase {
	type: "Colenear";
}

export type LinesRelation =
	| NonIntersectingLines
	| IntersectingLines
	| ParallelLines
	| ColenearLines;

// https://web.archive.org/web/20060911055655/
// http://local.wasp.uwa.edu.au/~pbourke/geometry/lineline2d/
export function getLinesRelationType(lineA: Line, lineB: Line): LinesRelation {
	let denominator =
		(lineB.end.y - lineB.start.y) * (lineA.end.x - lineA.start.x) -
		(lineB.end.x - lineB.start.x) * (lineA.end.y - lineA.start.y);
	if (denominator === Infinity || denominator === -Infinity) {
		denominator = Number.MAX_VALUE;
	}
	let parameterA =
		(lineB.end.x - lineB.start.x) * (lineA.start.y - lineB.start.y) -
		(lineB.end.y - lineB.start.y) * (lineA.start.x - lineB.start.x);
	if (parameterA === Infinity || parameterA === -Infinity) {
		parameterA = Number.MAX_VALUE;
	}
	let parameterB =
		(lineA.end.x - lineA.start.x) * (lineA.start.y - lineB.start.y) -
		(lineA.end.y - lineA.start.y) * (lineA.start.x - lineB.start.x);
	if (parameterB === Infinity || parameterB === -Infinity) {
		parameterB = Number.MAX_VALUE;
	}
	let type: "NonIntersecting" | "Colenear" | "Parallel" | "Intersecting" =
		"NonIntersecting";
	if (denominator === 0 && parameterA === 0 && parameterB === 0) {
		type = "Colenear";
	} else if (denominator === 0) {
		type = "Parallel";
	} else {
		const uA = parameterA / denominator;
		const uB = parameterB / denominator;
		if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
			type = "Intersecting";
		}
	}
	return {
		lineA,
		lineB,
		parameterA,
		parameterB,
		denominator,
		type,
	};
}

export function getIntersectionPointFromIntersectingLines(
	relation: IntersectingLines,
): Point {
	const { parameterA, denominator, lineA } = relation;
	const uA = parameterA / denominator;
	return new Point(
		lineA.start.x + uA * (lineA.end.x - lineA.start.x),
		lineA.start.y + uA * (lineA.end.y - lineA.start.y),
	);
}

export class Line {
	type = "Line" as const;
	isCenter = false;

	constructor(
		public start = new Point(),
		public end = new Point(),
		isCenter?: boolean,
	) {
		this.isCenter = isCenter ?? false;
	}

	getStartPoint(): Point {
		return this.start;
	}

	getLength(): number {
		const { start, end } = this;
		const deltaX = end.x - start.x;
		const deltaY = end.y - start.y;
		return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
	}

	getNearestPointParameter(point: Point): number {
		const length = this.getLength();
		if (length === 0) {
			return 0;
		}
		const { x, y } = point;
		const { start, end } = this;
		const parametr =
			((x - start.x) * (end.x - start.x) +
				(y - start.y) * (end.y - start.y)) /
			(length * length);
		return parametr;
	}

	getPoint(parameter: number): Point {
		const { start, end } = this;
		return new Point(
			start.x + parameter * (end.x - start.x),
			start.y + parameter * (end.y - start.y),
		);
	}

	// TODO: mb rename 'getPoint'
	getPointByTangent(tangent: number): Point {
		return this.getPoint(tangent);
	}

	// TODO: mb rename 'getNearestPointParameter'
	getTangentByPoint(point: Point): number {
		const tangent = this.getNearestPointParameter(point);
		return tangent;
	}

	getCenterPoint(): Point {
		const { start, end } = this;
		const centerX = (start.x + end.x) / 2;
		const centerY = (start.y + end.y) / 2;
		return new Point(centerX, centerY);
	}

	getNearestPointOnLineSegment(point: Point): Point {
		const lineParameter = this.getNearestPointParameter(point);
		const segmentParameter = forceNumberIntoInterval(lineParameter, 0, 1);
		return this.getPoint(segmentParameter);
	}

	getDistance(point: Point): number {
		const nearest = this.getNearestPointOnLineSegment(point);
		const distance = nearest.getDistance(point);
		return distance;
	}

	getIntersectionPoints(segment: Line): Point[] {
		const relation = getLinesRelationType(segment, this);
		switch (relation.type) {
			case "Intersecting":
				return [getIntersectionPointFromIntersectingLines(relation)];
			default:
				return [];
		}
	}

	hasIntersectionPoint(segment: Line): boolean {
		const ccw = (p1: Point, p2: Point, p3: Point) => {
			return (
				(p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)
			);
		};

		const intersect = (p1: Point, p2: Point, p3: Point, p4: Point) => {
			const ccw1 = ccw(p1, p2, p3);
			const ccw2 = ccw(p1, p2, p4);
			const ccw3 = ccw(p3, p4, p1);
			const ccw4 = ccw(p3, p4, p2);

			return ccw1 * ccw2 < 0 && ccw3 * ccw4 < 0;
		};
		return intersect(segment.start, segment.end, this.start, this.end);
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.getNearestPointOnLineSegment(point);
	}

	// https://stackoverflow.com/questions/42159032/how-to-find-angle-between-two-straight-lines-paths-on-a-svg-in-javascript
	getAngle(line: Line): number {
		const dAx = this.end.x - this.start.x;
		const dAy = this.end.y - this.start.x;
		const dBx = line.end.x - line.start.x;
		const dBy = line.end.y - line.start.x;
		let angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);
		if (angle < 0) {
			angle = angle * -1;
		}
		return angle * (180 / Math.PI);
	}

	getMbr(): Mbr {
		const { start, end } = this;
		return new Mbr(
			Math.min(start.x, end.x),
			Math.min(start.y, end.y),
			Math.max(start.x, end.x),
			Math.max(start.y, end.y),
		);
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		for (const line of rect.getLines()) {
			if (getLinesRelationType(line, this).type === "Intersecting") {
				return true;
			}
		}
		return this.getMbr().isEnclosedBy(rect);
	}

	getNormal(point: Point): GeometricNormal {
		const nearest = this.getNearestEdgePointTo(point);

		const dirX = this.end.x - this.start.x;
		const dirY = this.end.y - this.start.y;
		const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);

		const normalX = -dirY / magnitude;
		const normalY = dirX / magnitude;

		const normalPoint = new Point(normalX, normalY);

		return new GeometricNormal(point, nearest, normalPoint);
	}

	moveToStart(ctx: Path2D | CanvasRenderingContext2D): void {
		ctx.moveTo(this.start.x, this.start.y);
	}

	render(ctx: Path2D | CanvasRenderingContext2D): void {
		ctx.lineTo(this.end.x, this.end.y);
	}

	transform(matrix: Matrix): void {
		this.start.transform(matrix);
		this.end.transform(matrix);
	}

	getTransformed(matrix: Matrix): Line {
		return new Line(
			this.start.getTransformed(matrix),
			this.end.getTransformed(matrix),
		);
	}

	copy(): Line {
		return new Line(this.start.copy(), this.end.copy());
	}

	getParameter(point: Point): number {
		const { start, end } = this;
		const length = this.getLength();
		if (length === 0) {
			return 0;
		}
		const { x, y } = point;
		const parametr =
			((x - start.x) * (end.x - start.x) +
				(y - start.y) * (end.y - start.y)) /
			(length * length);
		return parametr;
	}
}
