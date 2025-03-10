import { Bezier, Projection } from "bezier-js";
import { toFiniteNumber } from "Board/lib";
import { Mbr } from "../Mbr";
import { Line } from "../Line";
import { Point } from "../Point";
import { Matrix } from "../Transformation";
import { GeometricNormal } from "../GeometricNormal";

export class BaseCurve {
	constructor(public curve: Bezier) {}

	protected updateCache(curve: Bezier): void {
		this.curve = curve;
	}

	getIntersectionPoints(segment: Line): Point[] {
		const parameters: number[] = this.curve.intersects({
			p1: segment.start,
			p2: segment.end,
		}) as number[];
		const intersections: Point[] = [];
		for (const parameter of parameters) {
			const { x, y } = this.curve.get(parameter);
			intersections.push(new Point(x, y));
		}
		return intersections;
	}

	getNearestEdgePointTo(point: Point): Point {
		const projection: Projection = this.curve.project(point);
		const { x, y } = projection;
		return new Point(x, y);
	}

	getDistance(point: Point): number {
		const projection: Projection = this.curve.project(point);
		const nearestPoint = new Point(projection.x, projection.y);
		return point.getDistance(nearestPoint);
	}

	private getIntersectionCurveRectangle(bounds: Mbr): Point[] {
		let points: Point[] = [];
		for (const line of bounds.getLines()) {
			points = points.concat(this.getIntersectionPoints(line));
		}
		return points;
	}

	getMbr(): Mbr {
		const { x, y } = this.curve.bbox();
		return new Mbr(x.min, y.min, x.max, y.max);
	}

	isEnclosedOrCrossedBy(bounds: Mbr): boolean {
		const contains = this.getMbr().isEnclosedBy(bounds);
		const intersects =
			this.getIntersectionCurveRectangle(bounds).length > 0;
		return contains || intersects;
	}

	getNormal(point: Point): GeometricNormal {
		// point = new Point(Math.round(point.x), Math.round(point.y));
		const projection = this.curve.project(point);
		// round up to 10s, fixed the problem when the normal angle changed a lot when the object was moved
		const tangent = Math.round(toFiniteNumber(projection.t) * 10) / 10;
		const normalPoint = this.curve.normal(tangent);
		return new GeometricNormal(
			point,
			new Point(projection.x, projection.y),
			new Point(normalPoint.x, normalPoint.y),
		);
	}

	getNewThatIntersectsPoints(
		pointA: Point,
		pointB: Point,
		pointC: Point,
	): CubicBezier {
		const [start, startControl, end, endControl] = Bezier.cubicFromPoints(
			pointA,
			pointB,
			pointC,
		).points;
		return new CubicBezier(
			new Point(start.x, start.y),
			new Point(startControl.x, startControl.y),
			new Point(end.x, end.y),
			new Point(endControl.x, endControl.y),
		);
	}

	getCenterPoint(): Point {
		const bPoint = this.curve.get(0.5);
		return new Point(bPoint.x, bPoint.y);
	}

	getPoint(parameter: number): Point {
		const bPoint = this.curve.get(parameter);
		return new Point(bPoint.x, bPoint.y);
	}

	getParameter(point: Point): number {
		const projection = this.curve.project(point);
		return projection.t || 0;
	}

	getLength(): number {
		return this.curve.length();
	}
}

export class QuadraticBezier extends BaseCurve {
	type = "QuadBezier" as const;

	static getCache(
		start = new Point(),
		control = new Point(),
		end = new Point(),
	): Bezier {
		return new Bezier(start.x, start.y, control.x, control.y, end.x, end.y);
	}

	constructor(
		public start = new Point(),
		public control = new Point(),
		public end = new Point(),
	) {
		super(QuadraticBezier.getCache(start, control, end));
	}

	protected updateCache(): void {
		super.updateCache(
			QuadraticBezier.getCache(this.start, this.control, this.end),
		);
	}

	getStartPoint(): Point {
		return this.start;
	}

	moveToStart(ctx: Path2D | CanvasRenderingContext2D): void {
		ctx.moveTo(this.start.x, this.start.y);
	}

	render(ctx: Path2D | CanvasRenderingContext2D): void {
		const { control, end } = this;
		ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
	}

	transform(matrix: Matrix): void {
		this.start.transform(matrix);
		this.control.transform(matrix);
		this.end.transform(matrix);
		this.updateCache();
	}

	getTransformed(matrix: Matrix): QuadraticBezier {
		return new QuadraticBezier(
			this.start.getTransformed(matrix),
			this.control.getTransformed(matrix),
			this.end.getTransformed(matrix),
		);
	}

	copy(): QuadraticBezier {
		return new QuadraticBezier(
			this.start.copy(),
			this.control.copy(),
			this.end.copy(),
		);
	}
}

export class CubicBezier extends BaseCurve {
	type = "CubicBezier" as const;

	static getCache(
		start = new Point(),
		startControl = new Point(),
		end = new Point(),
		endControl = new Point(),
	): Bezier {
		return new Bezier(
			start.x,
			start.y,
			startControl.x,
			startControl.y,
			endControl.x,
			endControl.y,
			end.x,
			end.y,
		);
	}

	constructor(
		public start = new Point(),
		public startControl = new Point(),
		public end = new Point(),
		public endControl = new Point(),
	) {
		super(CubicBezier.getCache(start, startControl, end, endControl));
	}

	protected updateCache(): void {
		super.updateCache(
			CubicBezier.getCache(
				this.start,
				this.startControl,
				this.end,
				this.endControl,
			),
		);
	}

	getStartPoint(): Point {
		return this.start;
	}

	moveToStart(ctx: Path2D | CanvasRenderingContext2D): void {
		ctx.moveTo(this.start.x, this.start.y);
	}

	render(ctx: Path2D | CanvasRenderingContext2D): void {
		const { startControl, end, endControl } = this;
		ctx.bezierCurveTo(
			startControl.x,
			startControl.y,
			endControl.x,
			endControl.y,
			end.x,
			end.y,
		);
	}

	transform(matrix: Matrix): void {
		this.start.transform(matrix);
		this.startControl.transform(matrix);
		this.end.transform(matrix);
		this.endControl.transform(matrix);
		this.updateCache();
	}

	getTransformed(matrix: Matrix): CubicBezier {
		return new CubicBezier(
			this.start.getTransformed(matrix),
			this.startControl.getTransformed(matrix),
			this.end.getTransformed(matrix),
			this.endControl.getTransformed(matrix),
		);
	}

	copy(): CubicBezier {
		return new CubicBezier(
			this.start.copy(),
			this.startControl.copy(),
			this.end.copy(),
			this.endControl.copy(),
		);
	}

	getMiddle(): Point {
		const curveLength = this.curve.length();
		const targetLength = curveLength / 2;
		const tValue = findTForLength(this.curve, targetLength);
		const middle = this.curve.get(tValue);
		return new Point(middle.x, middle.y);
	}
}

function findTForLength(
	curve: Bezier,
	target: number,
	error = 0.05,
	start = 0,
	end = 1,
): number {
	// eslint-disable-next-line id-length
	let t = (start + end) / 2;
	let iterations = 0;

	while (end - start > error) {
		const split = curve.split(t);
		const currentLength = split.left.length();

		if (currentLength > target) {
			end = t;
		} else if (currentLength < target) {
			start = t;
		} else {
			break;
		}

		t = (start + end) / 2;
		iterations++;

		if (iterations > 100) {
			console.warn("findTForLength: max iterations reached");
			break;
		}
	}

	return t;
}
