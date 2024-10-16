import { Mbr } from "../Mbr";
import { DrawingContext } from "../DrawingContext";
import { Geometry } from "../Geometry";
import { Line } from "../Line";
import { Point } from "../Point";
import { BorderStyle, BorderWidth, Path, PathStylize } from "./Path";
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
		private setterFilter: (
			m: string,
			v: any,
			p: Path,
			i: number,
		) => boolean = () => true,
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

	_setter<T extends keyof PathStylize>(p: any, method: T, v: any): void {
		if (method === "setBorderStyle") {
			const firstPathBorderStyle = this.paths[0].getBorderStyle();
			for (const path of this.paths) {
				if (path.getBorderStyle() !== firstPathBorderStyle) {
					return;
				}
			}
		}
		this.paths
			.filter((p, i) => this.setterFilter(method, v, p, i))
			.forEach(path => path[method].call<Path, any, void>(path, v));
		this[p as keyof this] = v;
	}
	setBackgroundColor(color: string): void {
		this._setter("backgroundColor", "setBackgroundColor", color);
	}
	setBorderColor(color: string): void {
		this._setter("borderColor", "setBorderColor", color);
	}
	setBorderStyle(style: BorderStyle): void {
		this._setter("borderStyle", "setBorderStyle", style);
	}
	setBorderWidth(width: BorderWidth): void {
		this._setter("borderWidth", "setBorderWidth", width);
	}
	setBackgroundOpacity(opacity: number): void {
		this._setter("backgroundOpacity", "setBackgroundOpacity", opacity);
	}
	setBorderOpacity(opacity: number): void {
		this._setter("borderOpacity", "setBorderOpacity", opacity);
	}

	getBackgroundOpacity(): number {
		return this.backgroundOpacity;
	}
	getBorderOpacity(): number {
		return this.borderOpacity;
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

	isPointOverEdges(point: Point, tolerance = 5): boolean {
		let isOver = false;
		for (const path of this.paths) {
			isOver = isOver || path.isPointOverEdges(point, tolerance);
		}
		return isOver;
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

	updateMaxDimension(scale?: number) {
		const mbr = this.getMbr();
		if (scale) {
			this.maxDimension = Math.max(
				mbr.getWidth() * scale,
				mbr.getHeight() * scale,
			);
		} else {
			this.maxDimension = Math.max(mbr.getWidth(), mbr.getHeight());
		}
	}

	render(context: DrawingContext): void {
		this.updateMaxDimension();
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
		const transformedPaths: Path[] = [];
		for (const path of this.paths) {
			transformedPaths.push(path.getTransformed(matrix));
		}
		return new Paths(
			transformedPaths,
			this.backgroundColor,
			this.borderColor,
			this.borderStyle,
			this.borderWidth,
			this.backgroundOpacity,
			this.borderOpacity,
			this.setterFilter,
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
			this.backgroundOpacity,
			this.borderOpacity,
			this.setterFilter,
		);
	}

	copyPaths(): Path[] {
		return this.paths.map(path => path.copy());
	}

	isClosed(): boolean {
		let isAllPathsOpened = true;
		this.paths.forEach(path => {
			if (path.isClosed()) {
				return (isAllPathsOpened = false);
			}
		});
		return !isAllPathsOpened;
	}
}
