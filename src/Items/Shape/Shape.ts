import { Mbr, Line, Point, Transformation, Path, Paths, Matrix } from "..";
import { Shapes, ShapeType } from "./Basic";
import { BorderStyle, BorderWidth } from "../Path";
import { Subject } from "Subject";
import { RichText } from "../RichText";
import { ShapeOperation } from "./ShapeOperation";
import { DefaultShapeData, ShapeData } from "./ShapeData";
import { Geometry } from "../Geometry";
import { DrawingContext } from "../DrawingContext";
import { Events, Operation } from "Board/Events";
import { ShapeCommand } from "./ShapeCommand";
import { GeometricNormal } from "../GeometricNormal";
import { ResizeType } from "../../Selection/Transformer/getResizeType";
import { getResize } from "../../Selection/Transformer/getResizeMatrix";

const defaultShapeData = new DefaultShapeData();

export class Shape implements Geometry {
	readonly itemType = "Shape";
	parent = "Board";
	readonly transformation = new Transformation(this.id, this.events);
	private path = Shapes[this.shapeType].path.copy();
	private textContainer = Shapes[this.shapeType].textBounds.copy();
	readonly text = new RichText(
		this.textContainer,
		this.id,
		this.events,
		this.transformation,
		"\u00A0",
		true,
		false,
		"Shape",
	);
	readonly subject = new Subject<Shape>();

	constructor(
		private events?: Events,
		private id = "",
		private shapeType = defaultShapeData.shapeType,
		private backgroundColor = defaultShapeData.backgroundColor,
		private backgroundOpacity = defaultShapeData.backgroundOpacity,
		private borderColor = defaultShapeData.borderColor,
		private borderOpacity = defaultShapeData.borderOpacity,
		private borderStyle = defaultShapeData.borderStyle,
		private borderWidth = defaultShapeData.borderWidth,
	) {
		this.transformation.subject.subscribe(() => {
			this.transformPath();
			this.updateMbr();
			this.text.updateElement();
			this.subject.publish(this);
		});
		this.text.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.text.insideOf = this.itemType;
	}

	emit(operation: ShapeOperation): void {
		if (this.events) {
			const command = new ShapeCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	serialize(): ShapeData {
		return {
			itemType: "Shape",
			shapeType: this.shapeType,
			backgroundColor: this.backgroundColor,
			backgroundOpacity: this.backgroundOpacity,
			borderColor: this.borderColor,
			borderOpacity: this.borderOpacity,
			borderStyle: this.borderStyle,
			borderWidth: this.borderWidth,
			transformation: this.transformation.serialize(),
			text: this.text.serialize(),
		};
	}

	deserialize(data: Partial<ShapeData>): this {
		if (data.shapeType) {
			this.shapeType = data.shapeType ?? this.shapeType;
			this.initPath();
		}
		this.backgroundColor = data.backgroundColor ?? this.backgroundColor;
		this.backgroundOpacity =
			data.backgroundOpacity ?? this.backgroundOpacity;
		this.borderColor = data.borderColor ?? this.borderColor;
		this.borderOpacity = data.borderOpacity ?? this.borderOpacity;
		this.borderStyle = data.borderStyle ?? this.borderStyle;
		this.borderWidth = data.borderWidth ?? this.borderWidth;
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
			this.transformPath();
		}
		if (data.text) {
			this.text.deserialize(data.text);
		}
		this.subject.publish(this);
		return this;
	}

	setId(id: string): this {
		this.id = id;
		this.text.setId(id);
		this.transformation.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "Shape":
				this.applyShapeOperation(op);
				this.updateMbr();
				break;
			case "RichText":
				this.text.apply(op);
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

	private applyShapeOperation(op: ShapeOperation): void {
		switch (op.method) {
			case "setBackgroundColor":
				this.applyBackgroundColor(op.backgroundColor);
				break;
			case "setBackgroundOpacity":
				this.applyBackgroundOpacity(op.backgroundOpacity);
				break;
			case "setBorderColor":
				this.applyBorderColor(op.borderColor);
				break;
			case "setBorderOpacity":
				this.applyBorderOpacity(op.borderOpacity);
				break;
			case "setBorderStyle":
				this.applyBorderStyle(op.borderStyle);
				break;
			case "setBorderWidth":
				this.applyBorderWidth(op.borderWidth);
				break;
			case "setShapeType":
				this.applyShapeType(op.shapeType);
				break;
		}
	}

	getShapeType(): ShapeType {
		return this.shapeType;
	}

	private applyShapeType(shapeType: ShapeType): void {
		this.shapeType = shapeType;
		this.initPath();
		this.transformPath();
	}

	setShapeType(shapeType: ShapeType): void {
		this.emit({
			class: "Shape",
			method: "setShapeType",
			item: [this.getId()],
			shapeType,
		});
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
			class: "Shape",
			method: "setBackgroundColor",
			item: [this.getId()],
			backgroundColor,
		});
	}

	getBackgroundOpacity(): number {
		return this.backgroundOpacity;
	}

	private applyBackgroundOpacity(backgroundOpacity: number): void {
		this.backgroundOpacity = backgroundOpacity;
		this.path.setBackgroundOpacity(backgroundOpacity);
	}

	setBackgroundOpacity(backgroundOpacity: number): void {
		this.emit({
			class: "Shape",
			method: "setBackgroundOpacity",
			item: [this.getId()],
			backgroundOpacity,
		});
	}

	getStrokeColor(): string {
		return this.borderColor;
	}

	private applyBorderColor(borderColor: string): void {
		this.borderColor = borderColor;
		this.path.setBorderColor(borderColor);
	}

	setBorderColor(borderColor: string): void {
		this.emit({
			class: "Shape",
			method: "setBorderColor",
			item: [this.getId()],
			borderColor,
		});
	}

	getBorderOpacity(): number {
		return this.borderOpacity;
	}

	private applyBorderOpacity(borderOpacity: number): void {
		this.borderOpacity = borderOpacity;
		this.path.setBorderOpacity(borderOpacity);
	}

	setBorderOpacity(borderOpacity: number): void {
		this.emit({
			class: "Shape",
			method: "setBorderOpacity",
			item: [this.getId()],
			borderOpacity,
		});
	}

	getBorderStyle(): BorderStyle {
		return this.borderStyle;
	}

	private applyBorderStyle(borderStyle: BorderStyle): void {
		this.borderStyle = borderStyle;
		this.path.setBorderStyle(borderStyle);
	}

	setBorderStyle(borderStyle: BorderStyle): void {
		this.emit({
			class: "Shape",
			method: "setBorderStyle",
			item: [this.getId()],
			borderStyle,
		});
	}

	getStrokeWidth(): BorderWidth {
		return this.borderWidth;
	}

	private applyBorderWidth(borderWidth: BorderWidth): void {
		this.borderWidth = borderWidth;
		this.path.setBorderWidth(borderWidth);
	}

	setBorderWidth(borderWidth: BorderWidth): void {
		this.emit({
			class: "Shape",
			method: "setBorderWidth",
			item: [this.getId()],
			borderWidth,
		});
	}

	getIntersectionPoints(segment: Line): Point[] {
		return this.getIntersectionPoints(segment); // REFACTOR infloop
	}

	updateMbr(): Mbr {
		const rect = this.path.getMbr();
		const rectOffset = this.getStrokeWidth() / 2;
		rect.left -= rectOffset;
		rect.right += rectOffset;
		rect.top -= rectOffset;
		rect.bottom += rectOffset;
		const textRect = this.textContainer.getMbr();
		rect.combine([textRect]);
		this.mbr = rect;
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
		return (
			this.textContainer.isUnderPoint(point) ||
			this.path.isUnderPoint(point)
		);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return distance > this.getDistanceToPoint(point);
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		return (
			this.textContainer.isEnclosedOrCrossedBy(rect) ||
			this.path.isEnclosedOrCrossedBy(rect)
		);
	}

	isEnclosedBy(rect: Mbr): boolean {
		return this.text.isEnclosedBy(rect) || this.path.isEnclosedBy(rect);
	}

	isInView(rect: Mbr): boolean {
		return this.isEnclosedOrCrossedBy(rect);
	}

	getNormal(point: Point): GeometricNormal {
		return this.path.getNormal(point);
	}

	render(context: DrawingContext): void {
		this.path.render(context);
		this.text.render(context);
	}

	getPaths(): Path | Paths {
		return this.path;
	}

	copyPaths(): Path | Paths {
		return this.path.copy();
	}

	isClosed(): boolean {
		return this.path instanceof Path && this.path.isClosed();
	}

	private initPath(): void {
		this.path = Shapes[this.shapeType].path.copy();
		this.textContainer = Shapes[this.shapeType].textBounds.copy();
		this.text.setContainer(this.textContainer.copy());
		this.text.updateElement();
	}

	private transformPath(): void {
		this.path = Shapes[this.shapeType].path.copy();
		this.textContainer = Shapes[this.shapeType].textBounds.copy();
		this.text.setContainer(this.textContainer.copy());
		this.textContainer.transform(this.transformation.matrix);
		/*
		const previous = this.transformation.previous.copy();
		console.log("previous", previous);
		previous.invert();
		console.log("inverted", previous);
		const delta = previous.multiplyByMatrix(
			this.transformation.matrix.copy(),
		);
		console.log("matrix", this.transformation.matrix);
		console.log("delta", delta);
		this.path.transform(delta);
		*/
		this.path.transform(this.transformation.matrix);

		this.path.setBackgroundColor(this.backgroundColor);
		this.path.setBackgroundOpacity(this.backgroundOpacity);
		this.path.setBorderColor(this.borderColor);
		this.path.setBorderWidth(this.borderWidth);
		this.path.setBorderStyle(this.borderStyle);
		this.path.setBorderOpacity(this.borderOpacity);
	}

	getPath(): Path | Paths {
		return this.path.copy();
	}

	getSnapAnchorPoints(): Point[] {
		const anchorPoints = Shapes[this.shapeType].anchorPoints;
		const points = [];
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
}
