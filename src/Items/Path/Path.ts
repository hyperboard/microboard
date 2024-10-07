import { isNumberOdd } from "utils";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Geometry } from "../Geometry";
import { Line } from "../Line";
import { CubicBezier, QuadraticBezier } from "../Curve";
import { Point } from "../Point";
import { Mbr } from "../Mbr";
import { Matrix } from "..";
import { GeometricNormal } from "../GeometricNormal";

export type Segment = Line | QuadraticBezier | CubicBezier;

export const LinePatterns = {
	solid: [] as number[],
	dot: [1, 1],
	dash: [10, 10],
	longDash: [20, 5],
	dotDash: [15, 3, 3, 3],
	tripleDotDash: [20, 3, 3, 3, 3, 3, 3, 3],
	looseDoubleDotDash: [12, 3, 3],
};

export type BorderStyle = keyof typeof LinePatterns;

export const LineStyles: BorderStyle[] = [
	"solid",
	"dot",
	"dash",
	"longDash",
	"dotDash",
	"tripleDotDash",
	"looseDoubleDotDash",
];

const scaledPatterns: { [key: number]: typeof LinePatterns } = {};

export function scalePatterns(scale: number): typeof LinePatterns {
	function scaleLinePattern(pattern: BorderStyle): number[] {
		const scaledPattern: number[] = [];
		for (const number of LinePatterns[pattern]) {
			scaledPattern.push(number * scale);
		}
		return scaledPattern;
	}

	const slp = scaleLinePattern;

	if (!scaledPatterns[scale]) {
		scaledPatterns[scale] = {
			solid: slp("solid"),
			dot: slp("dot"),
			dash: slp("dash"),
			longDash: slp("longDash"),
			dotDash: slp("dotDash"),
			tripleDotDash: slp("tripleDotDash"),
			looseDoubleDotDash: slp("looseDoubleDotDash"),
		};
	}
	return scaledPatterns[scale];
}

export type BorderWidth = keyof typeof scaledPatterns;

export const borderWidths: BorderWidth[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface PathStylize {
	setBackgroundColor: (color: string) => void;
	setBorderColor: (color: string) => void;
	setBorderStyle: (style: BorderStyle) => void;
	setBorderWidth: (style: BorderWidth) => void;
	setBackgroundOpacity: (opacity: number) => void;
	setBorderOpacity: (opacity: number) => void;
}

export class Path implements Geometry, PathStylize {
	private path2d = Path2D ? new Path2D() : undefined; // just to make tests run in node
	private x: number;
	private y: number;
	private width: number;
	private height: number;
	private maxDimension: number;
	private linePattern = scalePatterns(this.borderWidth)[this.borderStyle];
	connectedItemType = "";

	constructor(
		private segments: Segment[] = [],
		private isClosedValue = false,
		private backgroundColor = "none",
		private borderColor = "black",
		private borderStyle: BorderStyle = "solid",
		private borderWidth = 1,
		private backgroundOpacity = 1,
		private borderOpacity = 1,
		private shadowColor: string = "transparent",
		private shadowSize: number = 0,
	) {
		this.updateCache();
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
		this.backgroundColor = color;
	}

	setBorderColor(color: string): void {
		this.borderColor = color;
	}

	setBorderStyle(style: BorderStyle): void {
		this.borderStyle = style;
		this.linePattern = scalePatterns(this.borderWidth)[this.borderStyle];
	}

	setBorderWidth(width: number): void {
		this.borderWidth = width;
		this.linePattern = scalePatterns(this.borderWidth)[this.borderStyle];
	}

	getBackgroundOpacity(): number {
		return this.backgroundOpacity;
	}

	setBackgroundOpacity(opacity: number): void {
		this.backgroundOpacity = opacity;
	}

	getBorderOpacity(): number {
		return this.borderOpacity;
	}

	getWidth() {
		return this.width;
	}

	setBorderOpacity(opacity: number): void {
		this.borderOpacity = opacity;
	}

	private updateCache(): void {
		const { left, top, right, bottom } = this.getMbr();
		this.x = left;
		this.y = top;
		this.width = right - left;
		this.height = bottom - top;
		if (!Path2D) {
			return;
		}
		const path2d = new Path2D();
		if (this.segments.length === 0) {
			return;
		}
		this.segments[0].moveToStart(path2d);
		for (const segment of this.segments) {
			segment.render(path2d);
		}
		if (this.isClosedValue) {
			path2d.closePath();
		}
		this.path2d = path2d;
	}

	getIntersectionPoints(segment: Line): Point[] {
		let intersections: Point[] = [];
		for (const item of this.segments) {
			intersections = intersections.concat(
				item.getIntersectionPoints(segment),
			);
		}
		return intersections;
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.getNearestEdgeAndPointTo(point).point;
	}

	getNearestEdgeAndPointTo(point: Point): {
		index: number;
		segment: Segment;
		point: Point;
	} {
		interface Candidate {
			index: number;
			segment: Segment;
			point: Point;
			distance: number;
		}
		const candidates: Candidate[] = [];
		for (let index = 0; index < this.segments.length; index++) {
			const segment = this.segments[index];
			const pointOnSegment: Point = segment.getNearestEdgePointTo(point);
			candidates.push({
				index,
				segment,
				point: pointOnSegment,
				distance: point.getDistance(pointOnSegment),
			});
		}

		let nearest: Candidate = candidates[0];
		for (const candidate of candidates) {
			if (candidate.distance < nearest.distance) {
				nearest = candidate;
			}
		}
		return nearest;
	}

	getDistanceToPoint(point: Point): number {
		const nearest = this.getNearestEdgePointTo(point);
		return point.getDistance(nearest);
	}

	isUnderPoint(point: Point): boolean {
		return this.isEnclosedOrCrossedBy(
			new Mbr(point.x, point.y, point.x, point.y),
		);
	}

	isPointOverEdges(point: Point, tolerance = 5): boolean {
		for (const segment of this.segments) {
			const distance = segment.getDistance(point);
			if (distance <= tolerance) {
				return true;
			}
		}
		return false;
	}

	isNearPoint(point: Point, distance: number): boolean {
		return distance > this.getDistanceToPoint(point);
	}

	getMbr(): Mbr {
		if (this.segments.length === 0) {
			throw new Error("The path is empty.");
		}
		const mbr = this.segments[0].getMbr();
		for (let i = 1, len = this.segments.length; i < len; i++) {
			mbr.combine(this.segments[i].getMbr());
		}
		return mbr;
	}

	isEnclosedOrCrossedBy(bounds: Mbr): boolean {
		return this.isClosedValue
			? this.isClosedEnclosedOrCrossedBy(bounds)
			: this.isOpenEnclosedOrCrossedBy(bounds);
	}

	private isOpenEnclosedOrCrossedBy(rectangle: Mbr): boolean {
		let is = false;
		for (const item of this.segments) {
			is = is || item.isEnclosedOrCrossedBy(rectangle);
		}
		return is;
	}

	// Determining if a point lies on the interior of a polygon by Paul Bourke 1997
	// http://www.eecs.umich.edu/courses/eecs380/HANDOUTS/PROJ2/InsidePoly.html
	private isClosedEnclosedOrCrossedBy(rect: Mbr): boolean {
		const isEnclosedOrCrossedBy = this.isOpenEnclosedOrCrossedBy(rect);
		const { left, top } = rect;
		const infiniteLineIntersections = this.getIntersectionPoints(
			new Line(
				new Point(left, top),
				new Point(Number.MAX_VALUE / 1000000000000000, top),
			),
		);
		const isBoundsInside = isNumberOdd(infiniteLineIntersections.length);
		return isEnclosedOrCrossedBy || isBoundsInside;
	}

	isEnclosedBy(rect: Mbr): boolean {
		const { left, top } = rect;
		const infiniteLineIntersections = this.getIntersectionPoints(
			new Line(
				new Point(left, top),
				new Point(Number.MAX_VALUE / 1000000000000000, top),
			),
		);
		return isNumberOdd(infiniteLineIntersections.length);
	}

	isInView(rect: Mbr): boolean {
		return this.isEnclosedOrCrossedBy(rect);
	}

	getNormal(point: Point): GeometricNormal {
		let bestCandidate;
		for (const segment of this.segments) {
			const candidate = segment.getNormal(point);
			if (
				!bestCandidate ||
				candidate.getDistance() < bestCandidate.getDistance()
			) {
				bestCandidate = candidate;
			}
		}
		return bestCandidate || new GeometricNormal(point, point, point);
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
		// TODO use background and border opacity
		const scale = context.getCameraScale();
		this.updateMaxDimension(scale);
		if (this.maxDimension < context.rectangleVisibilyTreshold) {
			return;
		}
		const shouldFillBackground =
			this.isClosedValue &&
			this.backgroundColor !== "none" &&
			this.backgroundColor !== "";
		const ctx = context.ctx;
		if (this.maxDimension < context.shapeVisibilityTreshold) {
			if (shouldFillBackground) {
				ctx.fillStyle = this.backgroundColor;
				ctx.fillRect(this.x, this.y, this.width, this.height);
			}
			return;
		}
		if (context.isBorderInvisible && !this.shadowSize) {
			if (shouldFillBackground) {
				ctx.fillStyle = this.backgroundColor;
				ctx.fill(this.path2d!);
			}
		} else {
			if (this.shadowSize) {
				ctx.shadowColor = this.shadowColor;
				ctx.shadowBlur = this.shadowSize;
				ctx.shadowOffsetX = this.shadowSize;
				ctx.shadowOffsetY = this.shadowSize;
			} else {
				ctx.shadowColor = "transparent";
			}
			if (
				this.borderColor === "transparent" ||
				this.borderColor === "none" ||
				!this.borderColor
			) {
				ctx.strokeStyle = "transparent";
			} else {
				ctx.strokeStyle = this.borderColor;
			}
			ctx.lineWidth = this.borderWidth;
			ctx.setLineDash(this.linePattern);
			if (shouldFillBackground) {
				ctx.fillStyle = this.backgroundColor;
				ctx.fill(this.path2d!);
			}
		}

		// https://github.com/excalidraw/excalidraw/commit/760fd7b3a685e61e73bf0e34f3983ae0dd341b6a#diff-283e04402ba4c222353886885899d9b4ea46a012acc00d7121b3f2afd7e286f8R1084

		// if(this.connectedItemType === 'Connector') {
		// 	// TODO: Better implementation
		// 	ctx.globalCompositeOperation = "destination-out";
		// 	// ctx.fillStyle = 'red';
		// 	ctx.fillRect(this.x + this.width/2 - 25 , this.y + this.height/2 - 25, 50, 50);
		// 	ctx.globalCompositeOperation = 'source-over';
		// }

		ctx.stroke(this.path2d!);
	}

	transform(matrix: Matrix): void {
		for (const segment of this.segments) {
			segment.transform(matrix);
		}
		this.updateCache();
	}

	getTransformed(matrix: Matrix): Path {
		const path = this.copy();
		path.transform(matrix);
		return path;
	}

	copy(): Path {
		const newSegments: Segment[] = [];
		for (const segment of this.segments) {
			newSegments.push(segment.copy());
		}
		return new Path(
			newSegments,
			this.isClosedValue,
			this.backgroundColor,
			this.borderColor,
			this.borderStyle,
			this.borderWidth,
			this.backgroundOpacity,
			this.borderOpacity,
			this.shadowColor,
			this.shadowSize,
		);
	}

	getSegments(): Segment[] {
		return this.segments;
	}

	isClosed(): boolean {
		return this.isClosedValue;
	}

	addConnectedItemType(name: string): this {
		this.connectedItemType = name;
		return this;
	}
}
