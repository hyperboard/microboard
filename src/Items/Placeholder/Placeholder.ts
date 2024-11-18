import { Events, Operation } from "Board/Events";
import { DrawingContext } from "../DrawingContext";
import { Shapes } from "../Shape";
import PlaceholderImg from "shared/assets/imgs/no-img-icon.svg";
import { ResizeType } from "Board/Selection/Transformer/getResizeType";
import { Subject } from "Subject";
import { GeometricNormal } from "../GeometricNormal";
import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { Path, Paths } from "../Path";
import { Point } from "../Point";
import { Transformation, Matrix, TransformationData } from "../Transformation";
import { PlaceholderOperation } from "./PlaceholderOperation";
import { PlaceholderCommand } from "./PlaceholderCommand";
import { getResize } from "../../Selection/Transformer/getResizeMatrix";

export interface PlaceholderData {
	readonly itemType: "Placeholder";
	backgroundColor: string;
	icon: string;
	transformation: TransformationData;
	miroData?: unknown;
}

export class Placeholder {
	readonly itemType = "Placeholder";
	shapeType = "Rectangle";
	parent = "Board";
	readonly transformation: Transformation;
	private path = Shapes[this.shapeType].path.copy();
	private mbr = Shapes[this.shapeType].path.getMbr().copy();
	readonly subject = new Subject<Placeholder>();
	transformationRenderBlock?: boolean = undefined;
	iconImage;

	constructor(
		private events?: Events,
		private miroData?: unknown,
		private id = "",
		private backgroundColor = "#E5E5EA",
		private icon: string = PlaceholderImg?.toString() || "",
	) {
		this.transformation = new Transformation(this.id, this.events);
		this.transformation.subject.subscribe((_subject: Transformation) => {
			this.transformPath();
			this.updateMbr();
			this.subject.publish(this);
		});
		this.updateMbr();
		this.loadIconImage();
	}

	emit(operation: PlaceholderOperation): void {
		if (this.events) {
			const command = new PlaceholderCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	serialize(): PlaceholderData {
		return {
			itemType: "Placeholder",
			backgroundColor: this.backgroundColor,
			icon: this.icon,
			transformation: this.transformation.serialize(),
			miroData: this.miroData,
		};
	}

	deserialize(data: Partial<PlaceholderData>): this {
		this.initPath();
		this.backgroundColor = data.backgroundColor ?? this.backgroundColor;
		this.icon = data.icon ?? this.icon;
		this.miroData = data.miroData;
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
			this.transformPath();
		}
		this.subject.publish(this);
		return this;
	}

	setId(id: string): this {
		this.id = id;
		this.transformation.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "Placeholder":
				this.applyPlaceholder(op);
				this.updateMbr();
				break;
			case "Transformation":
				this.transformation.apply(op);
				// this.text.setContainer(this.text.container);
				break;
			default:
				return;
		}
		this.subject.publish(this);
	}

	private applyPlaceholder(op: PlaceholderOperation): void {
		switch (op.method) {
			case "setBackgroundColor":
				this.applyBackgroundColor(op.backgroundColor);
				break;
			case "setIcon":
				this.applyIcon(op.icon);
				break;
			case "setMiroData":
				this.applyMiroData(op.miroData);
				break;
		}
	}

	getBackgroundColor(): string {
		return this.backgroundColor;
	}

	private applyBackgroundColor(backgroundColor: string): void {
		this.backgroundColor = backgroundColor;
		this.path.setBackgroundColor(backgroundColor);
	}

	setBackgroundColor(backgroundColor: string): void {
		this.emit({
			class: "Placeholder",
			method: "setBackgroundColor",
			item: [this.getId()],
			backgroundColor,
		});
	}

	getIcon(): string {
		return this.icon;
	}

	private applyIcon(icon: string): void {
		this.icon = icon;
	}

	setIcon(icon: string): void {
		this.emit({
			class: "Placeholder",
			method: "setIcon",
			item: [this.getId()],
			icon,
		});
	}

	getMiroData(): any {
		return this.miroData;
	}

	private applyMiroData(miroData: unknown): void {
		this.miroData = miroData;
	}

	setMiroData(miroData: unknown): void {
		this.emit({
			class: "Placeholder",
			method: "setMiroData",
			item: [this.getId()],
			miroData,
		});
	}

	getIntersectionPoints(segment: Line): Point[] {
		return this.getIntersectionPoints(segment); // REFACTOR infloop
	}
	updateMbr(): Mbr {
		const rect = this.path.getMbr();
		const rectOffset = 1 / 2;
		rect.left -= rectOffset;
		rect.right += rectOffset;
		rect.top -= rectOffset;
		rect.bottom += rectOffset;
		this.mbr = rect;
		return rect;
	}

	getMbr(): Mbr {
		return this.mbr.copy();
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.path.getNearestEdgePointTo(point);
	}

	getDistanceToPoint(point: Point): number {
		const nearest = this.getNearestEdgePointTo(point);
		return point.getDistance(nearest);
	}

	isUnderPoint(point: Point): boolean {
		return this.path.isUnderPoint(point);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return distance > this.getDistanceToPoint(point);
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		return this.path.isEnclosedOrCrossedBy(rect);
	}

	isEnclosedBy(rect: Mbr): boolean {
		return this.path.isEnclosedBy(rect);
	}

	isInView(rect: Mbr): boolean {
		return this.isEnclosedOrCrossedBy(rect);
	}

	getNormal(point: Point): GeometricNormal {
		return this.path.getNormal(point);
	}

	getPaths(): Path | Paths {
		return this.path;
	}

	getPath(): Path | Paths {
		return this.path.copy();
	}

	copyPaths(): Path | Paths {
		return this.path.copy();
	}

	isClosed(): boolean {
		return this.path instanceof Path && this.path.isClosed();
	}

	getSnapAnchorPoints(): Point[] {
		const anchorPoints = Shapes[this.shapeType].anchorPoints;
		const points: Point[] = [];
		for (const anchorPoint of anchorPoints) {
			points.push(anchorPoint.getTransformed(this.transformation.matrix));
		}
		return points;
	}

	doResize(
		resizeType: ResizeType,
		pointer: Point,
		mbr: Mbr,
		opposite: Point,
		startMbr: Mbr,
		timeStamp: number,
	): { matrix: Matrix; mbr: Mbr } {
		const res = getResize(resizeType, pointer, mbr, opposite);

		this.transformation.scaleByTranslateBy(
			{
				x: res.matrix.scaleX,
				y: res.matrix.scaleY,
			},
			{
				x: res.matrix.translateX,
				y: res.matrix.translateY,
			},
			timeStamp,
		);
		res.mbr = this.getMbr();
		return res;
	}

	private transformPath(): void {
		this.path = Shapes[this.shapeType].createPath(this.mbr);
		this.path.transform(this.transformation.matrix);
		this.path.setBackgroundColor(this.backgroundColor);
		this.path.setBorderColor("transparent");
	}

	private initPath(): void {
		this.path = Shapes[this.shapeType].createPath(this.mbr);
	}

	private loadIconImage(): void {
		this.iconImage = new Image();
		this.iconImage.src = PlaceholderImg?.toString() || "";

		this.iconImage.onload = () => {
			this.subject.publish(this);
		};

		this.iconImage.onerror = () => {
			console.error("Failed to load icon image.");
		};
	}

	private renderIcon(context: DrawingContext): void {
		if (!this.iconImage) {
			return;
		}
		const mbr = this.getMbr();
		const minSide = Math.min(
			this.getMbr().getWidth(),
			this.getMbr().getHeight(),
		);

		let iconSize = Math.floor(minSide / 3);
		if (iconSize % 2 !== 0) {
			iconSize += 1;
		}

		const iconX = mbr.left + (this.getMbr().getWidth() - iconSize) / 2;
		const iconY = mbr.top + (this.getMbr().getHeight() - iconSize) / 2;

		context.ctx.drawImage(this.iconImage, iconX, iconY, iconSize, iconSize);
	}

	private renderShadowShape(context: DrawingContext): void {
		this.path.setShadowBlur(5);
		this.path.setShadowOffsetX(0);
		this.path.setShadowOffsetY(1);
		this.path.setShadowColor("rgba(20, 21, 26, 0.06)");
		this.path.render(context);
		context.ctx.restore();

		this.path.setShadowBlur(3);
		this.path.setShadowOffsetX(0);
		this.path.setShadowOffsetY(1);
		this.path.setShadowColor("rgba(20, 21, 26, 0.1)");
		this.path.render(context);
		context.ctx.restore();
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}

		this.renderShadowShape(context);
		this.renderIcon(context);
	}

	getLinkTo(): undefined {
		return undefined;
	}

	getLink(): string {
		return `${window.location.origin}${
			window.location.pathname
		}?focus=${this.getId()}`;
	}

	getRichText(): null {
		return null;
	}
}
