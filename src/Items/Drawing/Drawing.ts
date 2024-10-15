import { Events, Operation } from "Board/Events";
import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { BorderStyle, BorderWidth, Path, Paths, scalePatterns } from "../Path";
import { Point } from "../Point";
import { Transformation } from "../Transformation";
import { DrawingCommand } from "./DrawingCommand";
import { DrawingOperation } from "./DrawingOperation";
import { TransformationData } from "../Transformation/TransformationData";
import { Geometry } from "../Geometry";

export interface DrawingData {
	itemType: "Drawing";
	points: { x: number; y: number }[];
	transformation: TransformationData;
	strokeStyle: string;
	strokeWidth: number;
}

export class Drawing extends Mbr implements Geometry {
	readonly itemType = "Drawing";
	parent = "Board";
	readonly transformation = new Transformation(this.id, this.events);
	private path2d = Path2D ? new Path2D() : undefined; // just to make tests run in node
	readonly subject = new Subject<Drawing>();
	untransformedMbr = new Mbr();
	private lines: Line[] = [];
	strokeWidth: BorderWidth = 1;
	borderStyle: BorderStyle = "solid";
	private linePattern = scalePatterns(this.strokeWidth)[this.borderStyle];
	private borderOpacity = 1;
	transformationRenderBlock?: boolean = undefined;

	constructor(
		public points: Point[],
		private events?: Events,
		private id = "",
	) {
		super();
		this.transformation.subject.subscribe(() => {
			this.updateMbr();
			this.updateLines();
			this.subject.publish(this);
		});
		this.updateLines();
	}

	serialize(): DrawingData {
		this.optimizePoints();
		const points: { x: number; y: number }[] = [];
		for (const point of this.points) {
			points.push({ x: point.x, y: point.y });
		}
		return {
			itemType: "Drawing",
			points,
			transformation: this.transformation.serialize(),
			strokeStyle: this.borderColor,
			strokeWidth: this.strokeWidth,
		};
	}

	deserialize(data: DrawingData): this {
		this.points = [];
		for (const point of data.points) {
			this.points.push(new Point(point.x, point.y));
		}
		this.optimizePoints();
		this.updateGeometry();
		this.transformation.deserialize(data.transformation);
		this.borderColor = data.strokeStyle;
		this.strokeWidth = data.strokeWidth;
		return this;
	}

	updateGeometry(): void {
		this.updatePath2d();
		this.updateMbr();
		this.updateLines();
	}

	updateMbr(): void {
		/*
		const width = this.untransformedMbr.getWidth();
		const height = this.untransformedMbr.getHeight();
		this.left =
			this.untransformedMbr.left + this.transformation.matrix.translateX;
		this.top =
			this.untransformedMbr.top + this.transformation.matrix.translateY;
		this.right = this.left + width * this.transformation.matrix.scaleX;
		this.bottom = this.top + height * this.transformation.matrix.scaleY;
		*/
		const mbr = this.untransformedMbr.getTransformed(
			this.transformation.matrix,
		);

		this.left = mbr.left;
		this.top = mbr.top;
		this.right = mbr.right;
		this.bottom = mbr.bottom;
	}

	updatePath2d(): void {
		this.path2d = new Path2D();
		const context = this.path2d;
		const points = this.points;
		if (points.length < 3) {
			context.arc(points[0].x, points[0].y, 0.5, 0, Math.PI * 2, true);
			context.closePath();
		} else {
			context.moveTo(points[0].x, points[0].y);

			let j = 1;

			for (; j < points.length - 2; j++) {
				const cx = (points[j].x + points[j + 1].x) / 2;
				const cy = (points[j].y + points[j + 1].y) / 2;
				context.quadraticCurveTo(points[j].x, points[j].y, cx, cy);
			}

			context.quadraticCurveTo(
				points[j].x,
				points[j].y,
				points[j + 1].x,
				points[j + 1].y,
			);
		}

		let left = Number.MAX_SAFE_INTEGER;
		let right = Number.MIN_SAFE_INTEGER;
		let top = Number.MAX_SAFE_INTEGER;
		let bottom = Number.MIN_SAFE_INTEGER;

		for (const { x, y } of this.points) {
			if (x < left) {
				left = x;
			}
			if (x > right) {
				right = x;
			}
			if (y < top) {
				top = y;
			}
			if (y > bottom) {
				bottom = y;
			}
		}

		this.untransformedMbr = new Mbr(left, top, right, bottom);
	}

	updateLines(): void {
		this.lines = [];
		const matrix = this.transformation.matrix;
		if (this.points.length < 2) {
			return;
		}
		for (let i = 0; i < this.points.length - 2; i++) {
			const p1 = this.points[i];
			const p2 = this.points[i + 1];
			const line = new Line(p1.copy(), p2.copy());
			line.transform(matrix);
			this.lines.push(line);
		}
	}

	optimizePoints(): void {
		const dp = douglasPeucker(this.points, 1);
		// const dp = rdpWithDistanceThreshold(this.points, 1);
		dp.push(this.points[this.points.length - 1]);
		this.points = dp;
	}

	addPoint(point: Point): void {
		const previous = this.points[this.points.length - 1];
		if (previous) {
			const distance = point.getDistance(previous);
			if (distance >= 2) {
				// adjust this threshold as needed
				this.points.push(point);
				this.updateGeometry();
			}
		} else {
			this.points.push(point);
			this.updateGeometry();
		}
	}

	setId(id: string): this {
		this.id = id;
		this.transformation.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		const ctx = context.ctx;
		ctx.save();
		ctx.strokeStyle = this.borderColor;
		ctx.lineWidth = this.strokeWidth;
		ctx.lineCap = "round";
		ctx.setLineDash(this.linePattern);
		this.transformation.matrix.applyToContext(ctx);
		ctx.stroke(this.path2d!);
		ctx.restore();
	}

	getPath(): Path | Paths {
		const { left, top, right, bottom } = this.getMbr();
		const leftTop = new Point(left, top);
		const rightTop = new Point(right, top);
		const rightBottom = new Point(right, bottom);
		const leftBottom = new Point(left, bottom);
		return new Path(
			[
				new Line(leftTop, rightTop),
				new Line(rightTop, rightBottom),
				new Line(rightBottom, leftBottom),
				new Line(leftBottom, leftTop),
			],
			true,
		);
	}

	getSnapAnchorPoints(): Point[] {
		const mbr = this.getMbr();
		const width = mbr.getWidth();
		const height = mbr.getHeight();
		return [
			new Point(mbr.left + width / 2, mbr.top),
			new Point(mbr.left + width / 2, mbr.bottom),
			new Point(mbr.left, mbr.top + height / 2),
			new Point(mbr.right, mbr.top + height / 2),
		];
	}

	isClosed(): boolean {
		return true;
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		for (const line of this.lines) {
			if (line.isEnclosedOrCrossedBy(rect)) {
				return true;
			}
		}
		return false;
	}

	emit(operation: DrawingOperation): void {
		if (this.events) {
			const command = new DrawingCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "Drawing":
				switch (op.method) {
					case "setStrokeColor":
						this.borderColor = op.color;
						break;
					case "setStrokeWidth":
						this.strokeWidth = op.width;
						this.linePattern = scalePatterns(this.strokeWidth)[
							this.borderStyle
						];
						break;
					case "setStrokeOpacity":
						this.borderOpacity = op.opacity;
						break;
					case "setStrokeStyle":
						this.borderStyle = op.style;
						this.linePattern = scalePatterns(this.strokeWidth)[
							this.borderStyle
						];
						break;
				}
				break;
			case "Transformation":
				this.transformation.apply(op);
				break;
			default:
				return;
		}
		this.subject.publish(this);
	}

	setStrokeOpacity(opacity: number): this {
		this.emit({
			class: "Drawing",
			method: "setStrokeOpacity",
			item: [this.id],
			opacity,
		});
		return this;
	}

	getStrokeOpacity(): number {
		return this.borderOpacity;
	}

	setBorderStyle(style: BorderStyle): this {
		this.emit({
			class: "Drawing",
			method: "setStrokeStyle",
			item: [this.id],
			style,
		});
		return this;
	}

	getBorderStyle(): BorderStyle {
		return this.borderStyle;
	}

	setStrokeColor(color: string): this {
		this.emit({
			class: "Drawing",
			method: "setStrokeColor",
			item: [this.id],
			color,
		});
		return this;
	}

	getStrokeColor(): string {
		return this.borderColor;
	}

	setStrokeWidth(width: number): this {
		this.emit({
			class: "Drawing",
			method: "setStrokeWidth",
			item: [this.id],
			width,
			prevWidth: this.strokeWidth,
		});
		return this;
	}

	getStrokeWidth(): number {
		return this.strokeWidth;
	}

	getRichText(): null {
		return null;
	}
}

function getPerpendicularDistance(
	point: Point,
	lineStart: Point,
	lineEnd: Point,
): number {
	const { x: px, y: py } = point;
	const { x: sx, y: sy } = lineStart;
	const { x: ex, y: ey } = lineEnd;

	const numerator = Math.abs(
		(ey - sy) * px - (ex - sx) * py + ex * sy - ey * sx,
	);
	const denominator = Math.sqrt(Math.pow(ey - sy, 2) + Math.pow(ex - sx, 2));
	return numerator / denominator;
}

function douglasPeucker(points: Point[], epsilon: number): Point[] {
	if (points.length < 3) {
		return points;
	}

	const start = points[0];
	const end = points[points.length - 1];
	let maxDistance = 0;
	let maxIndex = 0;

	for (let i = 1; i < points.length - 1; i++) {
		const distance = getPerpendicularDistance(points[i], start, end);
		if (distance > maxDistance) {
			maxDistance = distance;
			maxIndex = i;
		}
	}

	if (maxDistance > epsilon) {
		const leftSubPoints = points.slice(0, maxIndex + 1);
		const rightSubPoints = points.slice(maxIndex);
		const leftRecursiveResult = douglasPeucker(leftSubPoints, epsilon);
		const rightRecursiveResult = douglasPeucker(rightSubPoints, epsilon);
		// Add the last point of the left subarray if it's not part of a straight line
		// if (leftSubPoints[leftSubPoints.length - 1] !== rightSubPoints[0]) {
		// 	leftRecursiveResult.push(rightSubPoints[0]);
		// }
		return leftRecursiveResult.slice(0, -1).concat(rightRecursiveResult);
	} else {
		return [start, end];
	}
}
