import { Mbr } from "../Mbr";
import { DrawingContext } from "../DrawingContext";
import { Geometry } from "../Geometry";
import { Line } from "../Line";
import { Point } from "../Point";
import { BorderStyle, BorderWidth, Path } from "./Path";
import { Matrix } from "../Transformation";
import { GeometricNormal } from "../GeometricNormal";

export class Paths implements Geometry {
	private x: number;
	private y: number;
	private width: number;
	private height: number;
	private maxDimension: number;

	constructor(
		private paths: Path[],
		private backgroundColor = "",
		private borderColor = "black",
		private borderStyle: BorderStyle = "solid",
		private borderWidth: BorderWidth = 1,
		private backgroundOpacity = 1,
		private borderOpacity = 1,
	) {
		this.setBackgroundColor(this.backgroundColor);
		this.setBorderColor(this.borderColor);
		this.setBorderStyle(this.borderStyle);
		this.setBorderWidth(this.borderWidth);
		const mbr = this.getMbr();
		this.x = mbr.left;
		this.y = mbr.top;
		this.width = this.getMbr().getWidth();
		this.height = this.getMbr().getHeight();
		this.maxDimension = Math.max(mbr.getWidth(), mbr.getHeight());
	}

	getBackgroundColor(): string {
		return this.backgroundColor;
	}

	getBorderColor(): string {
		return this.borderColor;
	}

	getBorderStyle(): BorderStyle {
		return this.borderStyle;
	}

	getBorderWidth(): BorderWidth {
		return this.borderWidth;
	}

	setBackgroundColor(color: string): void {
		for (const path of this.paths) {
			path.setBackgroundColor(color);
		}
		this.backgroundColor = color;
	}

	setBorderColor(color: string): void {
		for (const path of this.paths) {
			path.setBorderColor(color);
		}
		this.borderColor = color;
	}

	setBorderStyle(style: BorderStyle): void {
		for (const path of this.paths) {
			path.setBorderStyle(style);
		}
		this.borderStyle = style;
	}

	setBorderWidth(width: BorderWidth): void {
		for (const path of this.paths) {
			path.setBorderWidth(width);
		}
		this.borderWidth = width;
	}

	getBackgroundOpacity(): number {
		return this.backgroundOpacity;
	}

	setBackgroundOpacity(opacity: number): void {
		for (const path of this.paths) {
			path.setBackgroundOpacity(opacity);
		}
		this.backgroundOpacity = opacity;
	}

	getBorderOpacity(): number {
		return this.borderOpacity;
	}

	setBorderOpacity(opacity: number): void {
		for (const path of this.paths) {
			path.setBorderOpacity(opacity);
		}
		this.borderOpacity = opacity;
	}

	getIntersectionPoints(segment: Line): Point[] {
		let intersections: Point[] = [];
		for (const path of this.paths) {
			intersections = intersections.concat(
				path.getIntersectionPoints(segment),
			);
		}
		return intersections;
	}

	getNearestEdgePointTo(point: Point): Point {
		interface Candidate {
			point: Point;
			distance: number;
		}
		const candidates: Candidate[] = [];
		for (const path of this.paths) {
			const nearest: Point = path.getNearestEdgePointTo(point);
			candidates.push({
				point: nearest,
				distance: point.getDistance(nearest),
			});
		}
		let nearest: Candidate = candidates[0];
		for (const candidate of candidates) {
			if (candidate.distance < nearest.distance) {
				nearest = candidate;
			}
		}
		return nearest.point;
	}

	getDistanceToPoint(point: Point): number {
		const nearest = this.getNearestEdgePointTo(point);
		return point.getDistance(nearest);
	}

	isUnderPoint(point: Point): boolean {
		let is = false;
		for (const path of this.paths) {
			is = is || path.isUnderPoint(point);
		}
		return is;
	}

	isNearPoint(point: Point, distance: number): boolean {
		return distance > this.getDistanceToPoint(point);
	}

	getMbr(): Mbr {
		if (this.paths.length === 0) {
			throw new Error("The paths is empty.");
		}
		const mbr = this.paths[0].getMbr();
		for (let i = 1, len = this.paths.length; i < len; i++) {
			mbr.combine(this.paths[i].getMbr());
		}
		return mbr;
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		let is = false;
		for (const path of this.paths) {
			is = is || path.isEnclosedOrCrossedBy(rect);
		}
		return is;
	}

	isEnclosedBy(rect: Mbr): boolean {
		let is = false;
		for (const path of this.paths) {
			is = is || path.isEnclosedBy(rect);
		}
		return is;
	}

	isInView(rect: Mbr): boolean {
		return this.isEnclosedOrCrossedBy(rect);
	}

	getNormal(point: Point): GeometricNormal {
		const candidates = this.paths.map(path => path.getNormal(point));
		// with small distance
		return candidates.reduce((prev, curr) =>
			prev.getDistance() > curr.getDistance() ? curr : prev,
		);
	}

	render(context: DrawingContext): void {
		if (this.maxDimension < context.rectangleVisibilyTreshold) {
			return;
		}
		const ctx = context.ctx;
		if (this.maxDimension < context.shapeVisibilityTreshold) {
			ctx.fillStyle = this.backgroundColor;
			ctx.fillRect(this.x, this.y, this.width, this.height);
			return;
		}
		for (const path of this.paths) {
			path.render(context);
		}
	}

	transform(matrix: Matrix): void {
		for (const path of this.paths) {
			path.transform(matrix);
		}
		const mbr = this.getMbr();
		this.x = mbr.left;
		this.y = mbr.top;
		this.width = mbr.getWidth();
		this.height = mbr.getHeight();
		this.maxDimension = Math.max(this.width, this.height);
	}

	getTransformed(matrix: Matrix): Paths {
		const transformedPaths = [];
		for (const path of this.paths) {
			transformedPaths.push(path.getTransformed(matrix));
		}
		return new Paths(
			transformedPaths,
			this.backgroundColor,
			this.borderColor,
			this.borderStyle,
			this.borderWidth,
		);
	}

	getPaths(): Path[] {
		return this.paths;
	}

	copy(): Paths {
		return new Paths(
			this.copyPaths(),
			this.backgroundColor,
			this.borderColor,
			this.borderStyle,
			this.borderWidth,
		);
	}

	copyPaths(): Path[] {
		return this.paths.map(path => path.copy());
	}
}
