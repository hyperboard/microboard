import {
	Mbr,
	Line,
	Point,
	Transformation,
	Path,
	Paths,
	Matrix,
	TransformationOperation,
	Connector,
} from "..";
import { BasicShapes } from "./Basic";
import { ShapeType } from "./index";
import { BorderStyle, BorderWidth, LinePatterns } from "../Path";
import { Subject } from "Subject";
import { RichText } from "../RichText";
import { ShapeOperation } from "./ShapeOperation";
import { DefaultShapeData, ShapeData } from "./ShapeData";
import { Geometry } from "../Geometry";
import { DrawingContext } from "../DrawingContext";
import { Operation } from "Board/Events";
import { ShapeCommand } from "./ShapeCommand";
import { GeometricNormal } from "../GeometricNormal";
import { ResizeType } from "../../Selection/Transformer/getResizeType";
import { getResize } from "../../Selection/Transformer/getResizeMatrix";
import { tempStorage } from "App/SessionStorage";
import { LinkTo } from "../LinkTo/LinkTo";
import { BPMN } from "./BPMN";
import {
	positionRelatively,
	resetElementScale,
	scaleElementBy,
	translateElementBy,
} from "Board/HTMLRender";
import { Board } from "Board";
import { FixedPoint } from "Board/Items/Connector";
import { toRelativePoint } from "Board/Items/Connector/ControlPoint";
import { DocumentFactory } from "Board/api/DocumentFactory";

const defaultShapeData = new DefaultShapeData();

export const Shapes = { ...BasicShapes, ...BPMN };

export class Shape implements Geometry {
	readonly itemType = "Shape";
	parent = "Board";
	readonly transformation: Transformation;
	private path: Path | Paths;
	private textContainer: Mbr;
	readonly text: RichText;
	readonly linkTo: LinkTo;
	readonly subject = new Subject<Shape>();
	transformationRenderBlock?: boolean = undefined;

	constructor(
		private board: Board,
		private id = "",
		private shapeType = defaultShapeData.shapeType,
		private backgroundColor = defaultShapeData.backgroundColor,
		private backgroundOpacity = defaultShapeData.backgroundOpacity,
		private borderColor = defaultShapeData.borderColor,
		private borderOpacity = defaultShapeData.borderOpacity,
		private borderStyle = defaultShapeData.borderStyle,
		private borderWidth = defaultShapeData.borderWidth,
		private mbr = Shapes[shapeType].path.getMbr().copy(),
	) {
		this.linkTo = new LinkTo(this.id, this.board.events);
		this.transformation = new Transformation(this.id, this.board.events);
		this.path = Shapes[this.shapeType].path.copy();
		this.textContainer = Shapes[this.shapeType].textBounds.copy();
		this.text = new RichText(
			board,
			this.textContainer,
			this.id,
			this.transformation,
			this.linkTo,
			"\u00A0",
			true,
			false,
			"Shape",
		);

		this.transformation.subject.subscribe(
			(_subject: Transformation, op: TransformationOperation) => {
				this.transformPath();
				this.updateMbr();
				if (
					op.method === "translateTo" ||
					op.method === "translateBy"
				) {
					this.text.transformCanvas();
				} else if (op.method === "transformMany") {
					const currItemOp = op.items[this.getId()];
					if (
						currItemOp.method === "translateBy" ||
						currItemOp.method === "translateTo" ||
						(currItemOp.method === "scaleByTranslateBy" &&
							currItemOp.scale.x === 1 &&
							currItemOp.scale.y === 1)
					) {
						// translating
						this.text.transformCanvas();
					} else {
						// scaling
						this.text.handleInshapeScale();
					}
				} else {
					if (op.method === "scaleByTranslateBy") {
						this.text.handleInshapeScale();
					} else {
						this.text.updateElement();
					}
				}
				this.subject.publish(this);
			},
		);
		this.text.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.linkTo.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.text.insideOf = this.itemType;
		this.updateMbr();
	}

	private saveShapeData(): void {
		tempStorage.setShapeData({
			shapeType: this.shapeType,
			backgroundColor: this.backgroundColor,
			backgroundOpacity: this.backgroundOpacity,
			borderColor: this.borderColor,
			borderOpacity: this.borderOpacity,
			borderStyle: this.borderStyle,
			borderWidth: this.borderWidth,
		});
	}

	emit(operation: ShapeOperation): void {
		if (this.board.events) {
			const command = new ShapeCommand([this], operation);
			command.apply();
			this.board.events.emit(operation, command);
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
			linkTo: this.linkTo.serialize(),
		};
	}

	deserialize(data: Partial<ShapeData>): this {
		if (data.shapeType) {
			this.shapeType = data.shapeType ?? this.shapeType;
			this.initPath();
		}
		if (data.linkTo) {
			this.linkTo.deserialize(data.linkTo);
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
		this.linkTo.setId(id);
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
			case "LinkTo":
				this.linkTo.apply(op);
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
		this.saveShapeData();
	}

	getShapeType(): ShapeType {
		return this.shapeType;
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}

	private applyShapeType(shapeType: ShapeType): void {
		this.shapeType = shapeType;
		this.initPath();
		this.transformPath();
		// Smell: Can we not update connectors in shape?
		// Smell: Can we not iterate over all items?
		for (const connector of this.board.items.listAll()) {
			if (
				connector instanceof Connector &&
				(connector.getConnectedItems().endItem?.getId() ===
					this.getId() ||
					connector.getConnectedItems().startItem?.getId() ===
						this.getId())
			) {
				if (
					connector.getConnectedItems().endItem?.getId() ===
					this.getId()
				) {
					const nearestPoint = this.getNearestEdgePointTo(
						connector.getEndPoint().copy(),
					);
					connector.setEndPoint(
						new FixedPoint(
							this,
							toRelativePoint(nearestPoint, this),
						),
					);
				}

				if (
					connector.getConnectedItems().startItem?.getId() ===
					this.getId()
				) {
					const nearestPoint = this.getNearestEdgePointTo(
						connector.getStartPoint().copy(),
					);
					connector.setStartPoint(
						new FixedPoint(
							this,
							toRelativePoint(nearestPoint, this),
						),
					);
				}
			}
		}
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

	getBorderColor() {
		return this.borderColor;
	}

	getBorderWidth() {
		return this.borderWidth;
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
			prevBorderWidth: this.borderWidth,
		});
	}

	getIntersectionPoints(segment: Line): Point[] {
		return this.getIntersectionPoints(segment); // REFACTOR infloop
	}

	updateMbr(): Mbr {
		const rect = this.path.getMbr();
		const textRect = this.textContainer.getMbr();
		rect.combine([textRect]);
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

	isUnderPoint(point: Point, tolerance = 5): boolean {
		if (Shapes[this.shapeType].useMbrUnderPointer) {
			return this.mbr.isUnderPoint(point);
		}
		if (
			this.text.isEmpty() &&
			(this.backgroundOpacity === 0 ||
				this.backgroundColor === "none" ||
				this.backgroundColor === "")
		) {
			// If there's no text and no background (opacity 0 or color is 'none' or empty string), check only the path edges
			return this.path.isPointOverEdges(point, tolerance);
		} else {
			// Otherwise, use the original logic
			return (
				this.textContainer.isUnderPoint(point) ||
				this.path.isUnderPoint(point)
			);
		}
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
		if (this.transformationRenderBlock) {
			return;
		}
		this.path.render(context);
		this.text.render(context);
	}

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("shape-item");

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
		svg.setAttribute("transform-origin", "0 0");
		svg.setAttribute("transform", `scale(${1 / scaleX}, ${1 / scaleY})`);
		svg.setAttribute("style", "position: absolute; overflow: visible;");

		const pathElement = Shapes[this.shapeType].path
			.copy()
			.renderHTML(documentFactory);
		const paths = Array.isArray(pathElement) ? pathElement : [pathElement];
		paths.forEach(element => {
			element.setAttribute("fill", this.backgroundColor);
			element.setAttribute("stroke", this.borderColor);
			element.setAttribute(
				"stroke-dasharray",
				LinePatterns[this.borderStyle].join(", "),
			);
			element.setAttribute("stroke-width", this.borderWidth.toString());
			element.setAttribute("transform-origin", "0 0");
			element.setAttribute("transform", `scale(${scaleX}, ${scaleY})`);
		});
		svg.append(...paths);
		div.appendChild(svg);

		div.id = this.getId();
		div.style.width = unscaledWidth + "px";
		div.style.height = unscaledHeight + "px";
		div.style.transformOrigin = "left top";
		div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
		div.style.position = "absolute";
		div.setAttribute("data-shape-type", this.shapeType);
		div.setAttribute("fill", this.backgroundColor);
		div.setAttribute("stroke", this.borderColor);
		div.setAttribute("data-border-style", this.borderStyle);
		div.setAttribute(
			"stroke-dasharray",
			LinePatterns[this.borderStyle].join(", "),
		);
		div.setAttribute("stroke-width", this.borderWidth.toString());

		const textElement = this.text.renderHTML(documentFactory);
		textElement.id = `${this.getId()}_text`;
		textElement.style.maxWidth = `${width}px`;
		textElement.style.overflow = "auto";
		positionRelatively(textElement, div);
		resetElementScale(textElement);
		scaleElementBy(textElement, 1 / scaleX, 1 / scaleY);
		const [dx, dy] = [
			(width - parseInt(textElement.style.width)) / scaleX / 2 - 1,
			(height - parseInt(textElement.style.height)) / scaleY / 2 - 1,
		];
		translateElementBy(textElement, dx, dy);

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

		div.appendChild(textElement);

		return div;
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
		this.path = Shapes[this.shapeType].createPath(this.mbr);
		if (this.shapeType.split("_").length > 1) {
			this.borderWidth = this.path.getBorderWidth() || this.borderWidth;
			this.borderStyle = this.path.getBorderStyle() || this.borderStyle;
			this.backgroundColor =
				this.path.getBackgroundColor() || this.backgroundColor;
			this.backgroundOpacity =
				this.path.getBackgroundOpacity() || this.backgroundOpacity;
			this.borderColor = this.path.getBorderColor() || this.borderColor;
			this.borderOpacity =
				this.path.getBorderOpacity() || this.borderOpacity;
		}
		this.textContainer = Shapes[this.shapeType].textBounds.copy();
		this.text.setContainer(this.textContainer.copy());
		this.text.updateElement();
	}

	private transformPath(): void {
		this.path = Shapes[this.shapeType].createPath(this.mbr);
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

	getRichText(): RichText {
		return this.text;
	}

	getIsShapeWithText(): boolean {
		return !(
			this.textContainer.top === this.textContainer.bottom &&
			this.textContainer.right === this.textContainer.left
		);
	}

	getIsBorderStyleEditable(): boolean {
		switch (this.shapeType.split("_")[0]) {
			case "BPMN":
				return false;
		}
		return true;
	}
}
