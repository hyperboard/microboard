import { Events, Operation } from "Board/Events";
import { Subject } from "shared/Subject";
import { DrawingContext } from "../DrawingContext";
import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { BorderStyle, BorderWidth, Path, scalePatterns } from "../Path";
import { Point } from "../Point";
import { Transformation } from "../Transformation";
import { DrawingCommand } from "./DrawingCommand";
import { DrawingOperation } from "./DrawingOperation";
import { TransformationData } from "../Transformation/TransformationData";
import { Geometry } from "../Geometry";
import { isSafari } from "App/isSafari";
import { LinkTo } from "../LinkTo/LinkTo";
import {
	scaleElementBy,
	translateElementBy,
} from "Board/HTMLRender/HTMLRender";
import { DocumentFactory } from "Board/api/DocumentFactory";
import { SETTINGS } from "Board/Settings";

export interface DrawingData {
	itemType: "Drawing";
	points: { x: number; y: number }[];
	transformation: TransformationData;
	strokeStyle: string;
	strokeWidth: number;
	linkTo?: string;
}

export class Drawing extends Mbr implements Geometry {
	readonly itemType = "Drawing";
	parent = "Board";
	readonly transformation: Transformation;
	private path2d = new SETTINGS.path2DFactory();
	readonly subject = new Subject<Drawing>();
	untransformedMbr = new Mbr();
	private lines: Line[] = [];
	readonly linkTo: LinkTo;
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
		this.transformation = new Transformation(id, events);
		this.linkTo = new LinkTo(this.id, this.events);
		this.transformation.subject.subscribe(() => {
			this.updateMbr();
			this.updateLines();
			this.subject.publish(this);
		});
		this.linkTo.subject.subscribe(() => {
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
			linkTo: this.linkTo.serialize(),
		};
	}

	deserialize(data: DrawingData): this {
		this.points = [];
		for (const point of data.points) {
			this.points.push(new Point(point.x, point.y));
		}
		this.linkTo.deserialize(data.linkTo);
		this.optimizePoints();
		this.transformation.deserialize(data.transformation);
		this.borderColor = data.strokeStyle;
		this.strokeWidth = data.strokeWidth;
		this.updateGeometry();
		return this;
	}

	updateGeometry(): void {
		this.updatePath2d();
		this.updateLines();
		this.updateMbr();
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
		const offset = this.getStrokeWidth() / 2;
		const untransformedMbr = this.untransformedMbr.copy();
		untransformedMbr.left -= offset;
		untransformedMbr.top -= offset;
		untransformedMbr.right += offset;
		untransformedMbr.bottom += offset;

		const mbr = untransformedMbr.getTransformed(this.transformation.matrix);

		this.left = mbr.left;
		this.top = mbr.top;
		this.right = mbr.right;
		this.bottom = mbr.bottom;
	}

	updatePath2d(): void {
		this.path2d = new SETTINGS.path2DFactory();
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

			const x =
				points[j].x === points[j + 1].x && isSafari()
					? points[j + 1].x + 0.01
					: points[j + 1].x;
			const y =
				points[j].y === points[j + 1].y && isSafari()
					? points[j + 1].y + 0.01
					: points[j + 1].y;

			context.quadraticCurveTo(points[j].x, points[j].y, x, y);
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
			}
		} else {
			this.points.push(point);
		}
		this.updateGeometry();
	}

	setId(id: string): this {
		this.id = id;
		this.transformation.setId(id);
		this.linkTo.setId(id);
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
		ctx.stroke(this.path2d.nativePath);
		ctx.restore();
	}

	// smell have to redo without document
	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("drawing-item");

		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		const mbr = this.getMbr();
		const width = mbr.getWidth();
		const height = mbr.getHeight();
		const unscaledWidth = width / scaleX;
		const unscaledHeight = height / scaleY;

		const svg = documentFactory.createElementNS(
			"http://www.w3.org/2000/svg",
			"svg",
		);
		svg.setAttribute("width", `${unscaledWidth}px`);
		svg.setAttribute("height", `${unscaledHeight}px`);
		svg.setAttribute("viewBox", `0 0 ${unscaledWidth} ${unscaledHeight}`);
		svg.setAttribute("style", "position: absolute; overflow: visible;");
		// svg.setAttribute("transform-origin", "0 0");
		// svg.setAttribute("transform", `scale(${1 / scaleX}, ${1 / scaleY})`);

		const pathElement = documentFactory.createElementNS(
			"http://www.w3.org/2000/svg",
			"path",
		);
		pathElement.setAttribute("d", this.getPathData());
		pathElement.setAttribute("stroke", this.borderColor);
		pathElement.setAttribute("stroke-width", `${this.strokeWidth}`);
		pathElement.setAttribute("fill", "none");
		// pathElement.setAttribute("transform-origin", "0 0");
		// pathElement.setAttribute("transform", `scale(${scaleX}, ${scaleY})`);
		// pathElement.setAttribute("vector-effect", "non-scaling-stroke");

		svg.appendChild(pathElement);

		div.appendChild(svg);

		div.id = this.getId();
		div.style.width = unscaledWidth + "px";
		div.style.height = unscaledHeight + "px";
		div.style.transformOrigin = "left top";
		div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
		div.style.position = "absolute";

		div.setAttribute("data-link-to", this.linkTo.serialize() || "");
		if (this.getLinkTo()) {
			const linkElement = this.linkTo.renderHTML(documentFactory);
			scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
			translateElementBy(
				linkElement,
				(width - parseInt(linkElement.style.width)) / scaleX,
				0,
			);
			div.appendChild(linkElement);
		}

		return div;
	}

	private getPathData(): string {
		const points = this.points;
		if (points.length < 2) {
			return "";
		}

		let pathData = `M ${points[0].x} ${points[0].y}`;

		if (points.length < 3) {
			pathData += ` L ${points[0].x + 0.5} ${points[0].y}`;
		} else {
			let j = 1;
			for (; j < points.length - 2; j++) {
				const cx = (points[j].x + points[j + 1].x) / 2;
				const cy = (points[j].y + points[j + 1].y) / 2;
				pathData += ` Q ${points[j].x} ${points[j].y} ${cx} ${cy}`;
			}

			const x =
				points[j].x === points[j + 1].x && isSafari()
					? points[j + 1].x + 0.01
					: points[j + 1].x;
			const y =
				points[j].y === points[j + 1].y && isSafari()
					? points[j + 1].y + 0.01
					: points[j + 1].y;

			pathData += ` Q ${points[j].x} ${points[j].y} ${x} ${y}`;
		}

		return pathData;
	}

	getPath(): Path {
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

	getLines(): Line[] {
		return this.lines;
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
				this.updateMbr();
				break;
			case "Transformation":
				this.transformation.apply(op);
				break;
			case "LinkTo":
				this.linkTo.apply(op);
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

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}

	getStrokeWidth(): number {
		return this.strokeWidth;
	}

	getRichText(): null {
		return null;
	}

	isPointNearLine(point: Point, threshold: number | undefined = 10): boolean {
		const transformedMouseX =
			(point.x - this.transformation.matrix.translateX) /
			this.transformation.matrix.scaleX;
		const transformedMouseY =
			(point.y - this.transformation.matrix.translateY) /
			this.transformation.matrix.scaleY;
		const transformedMouse = new Point(
			transformedMouseX,
			transformedMouseY,
		);
		for (let i = 0; i < this.points.length - 1; i++) {
			const p1 = this.points[i];
			const p2 = this.points[i + 1];

			const distance = getPerpendicularDistance(transformedMouse, p1, p2);

			if (distance < threshold) {
				return true;
			}
		}
		return false;
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
