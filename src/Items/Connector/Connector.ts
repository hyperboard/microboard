import { RichText } from "Board/Items";
import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { DrawingContext } from "../DrawingContext";
import { ConnectorData, ConnectorOperation } from "./ConnectorOperations";
import { Path, Paths } from "../Path";
import { Transformation } from "../Transformation";
import { Subject } from "Subject";
import { Events, Operation } from "../../Events";
import { getLine } from "./getLine/getLine";
import {
	BoardPoint,
	ControlPoint,
	ControlPointData,
	getControlPoint,
} from "./ControlPoint";
import { ConnectorCommand } from "./ConnectorCommand";
import { Item } from "../Item";
import { Board } from "../../Board";
import { GeometricNormal } from "../GeometricNormal";
import { getStartPointer, getEndPointer } from "./Pointers";
import { Point } from "../Point";
import { CubicBezier } from "../Curve";
import {
	CONNECTOR_COLOR,
	CONNECTOR_LINE_WIDTH,
	DEFAULT_END_POINTER,
	DRAW_TEXT_BORDER,
	TEXT_BORDER_PADDING,
} from "View/Items/Connector";
import { SELECTION_COLOR } from "View/Tools/Selection";
import { ConnectorPointerStyle } from "./Pointers/Pointers";

export const ConnectorLineStyles = [
	"straight",
	"curved",
	"orthogonal",
] as const;

export type ConnectorLineStyle = typeof ConnectorLineStyles[number];

export const ConnectionLineWidths = [1, 2, 3, 4, 5, 8, 12, 16, 20, 24] as const;

export type ConnectionLineWidth = typeof ConnectionLineWidths[number];

export class Connector {
	readonly itemType = "Connector";
	parent = "Board";
	private id = "";
	readonly transformation = new Transformation(this.id, this.events);
	private middlePoints: BoardPoint[] = [];
	private startPointerStyle: ConnectorPointerStyle = "None";
	private endPointerStyle: ConnectorPointerStyle = DEFAULT_END_POINTER;
	private lineColor = CONNECTOR_COLOR;
	private lineStyle: ConnectorLineStyle = "straight";
	private lineWidth: ConnectionLineWidth = CONNECTOR_LINE_WIDTH;
	readonly subject = new Subject<Connector>();
	lines = new Path([new Line(new Point(), new Point())]);
	startPointer = getStartPointer(
		this.startPoint,
		this.startPointerStyle,
		this.lineStyle,
		this.lines,
	);
	endPointer = getEndPointer(
		this.endPoint,
		this.endPointerStyle,
		this.lineStyle,
		this.lines,
	);
	animationFrameId?: number;
	readonly text: RichText = new RichText(
		this.getMbr(),
		this.id,
		this.events,
		new Transformation(),
		"\u00A0",
		true,
	);

	constructor(
		private board: Board,
		private events?: Events,
		private startPoint: ControlPoint = new BoardPoint(),
		private endPoint: ControlPoint = new BoardPoint(),
	) {
		this.transformation.subject.subscribe(() => {
			this.transformBoardPoints();
			this.updatePaths();
			this.subject.publish(this);
		});
		this.offsetLines();
		this.initText();
	}

	private initText(): void {
		this.text.subject.subscribe(() => {
			this.updateTitle();
			this.subject.publish(this);
		});

		this.text.apply({
			class: "RichText",
			method: "setMaxWidth",
			item: [this.id],
			maxWidth: 300,
		});
		this.text.addMbr(this.getMbr());
		this.text.setSelectionHorisontalAlignment("left");
		this.text.editor.setSelectionHorisontalAlignment("left");
		this.text.setBoard(this.board);
		this.text.editor.applyRichTextOp({
			class: "RichText",
			method: "setMaxWidth",
			item: [this.id],
			maxWidth: 300,
		});
		this.text.setClipPath();

		this.updateTitle();
		/*
        const { x, y } = this.getMiddlePoint();

        this.text.transformation.apply({
            class: "Transformation",
            method: "translateTo",
            item: [this.id],
            x: x,
            y: y,
        });
        */
	}

	observerStartPointItem = (): void => {
		const point = this.startPoint;
		if (point.pointType !== "Board") {
			point.recalculatePoint();
			this.updatePaths();
			this.subject.publish(this);
		}
	};

	observerEndPointItem = (): void => {
		const point = this.endPoint;
		if (point.pointType !== "Board") {
			point.recalculatePoint();
			this.updatePaths();
			this.subject.publish(this);
		}
	};

	private unsubscribeFromItem(
		point: ControlPoint,
		observer: (item: Item) => void,
	): void {
		if (point.pointType !== "Board") {
			point.item.subject.unsubscribe(observer);
		}
	}

	private subscribeToItem(
		point: ControlPoint,
		observer: (item: Item) => void,
	): void {
		if (this.id) {
			if (point.pointType !== "Board") {
				point.item.subject.subscribe(observer);
			}
		}
	}

	emit(operation: ConnectorOperation): void {
		if (this.events) {
			const command = new ConnectorCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	setId(id: string): this {
		this.id = id;
		this.text.setId(id);
		// this.text.addConnector(id);
		this.transformation.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	apply(operation: Operation): void {
		switch (operation.class) {
			case "Connector":
				switch (operation.method) {
					case "setStartPoint":
						this.applyStartPoint(operation.startPointData);
						break;
					case "setEndPoint":
						this.applyEndPoint(operation.endPointData);
						break;
					case "setStartPointerStyle":
						this.applyStartPointerStyle(
							operation.startPointerStyle,
						);
						break;
					case "setEndPointerStyle":
						this.applyEndPointerStyle(operation.endPointerStyle);
						break;
					case "setLineStyle":
						this.applyLineStyle(operation.lineStyle);
						break;
					case "setLineColor":
						this.applyLineColor(operation.lineColor);
						break;
					case "setLineWidth":
						this.applyLineWidth(operation.lineWidth);
						break;
				}
				break;
			default:
				return;
		}
		this.subject.publish(this);
	}

	complete(id: string): void {
		this.id = id;
		this.updatePaths();
	}

	setStartPoint(point: ControlPoint): void {
		this.emit({
			class: "Connector",
			method: "setStartPoint",
			item: [this.id],
			startPointData: point.serialize(),
		});
	}

	private applyStartPoint(
		pointData: ControlPointData,
		updatePath = true,
	): void {
		if (
			pointData.pointType !== "Board" &&
			this.startPoint.pointType !== "Board" &&
			pointData.itemId === this.startPoint.item.getId()
		) {
			this.startPoint = getControlPoint(pointData, itemId =>
				this.board.items.findById(itemId),
			);
		} else {
			this.unsubscribeFromItem(
				this.startPoint,
				this.observerStartPointItem,
			);
			this.startPoint = getControlPoint(pointData, itemId =>
				this.board.items.findById(itemId),
			);
			this.subscribeToItem(this.startPoint, this.observerStartPointItem);
		}
		if (updatePath) {
			this.updatePaths();
		}
	}

	setEndPoint(point: ControlPoint): void {
		this.emit({
			class: "Connector",
			method: "setEndPoint",
			item: [this.id],
			endPointData: point.serialize(),
		});
	}

	private applyEndPoint(
		pointData: ControlPointData,
		updatePath = true,
	): void {
		this.unsubscribeFromItem(this.endPoint, this.observerEndPointItem);
		this.endPoint = getControlPoint(pointData, itemId =>
			this.board.items.findById(itemId),
		);
		this.subscribeToItem(this.endPoint, this.observerEndPointItem);
		if (updatePath) {
			this.updatePaths();
		}
	}

	addMiddlePoint(point: BoardPoint, afterPoint?: BoardPoint): void {
		if (afterPoint) {
			const afterPointIndex = this.middlePoints.indexOf(afterPoint);
			if (afterPointIndex === -1) {
				return;
			}
			this.middlePoints.splice(afterPointIndex, 0, point);
		} else {
			this.middlePoints.push(point);
		}
		this.updatePaths();
	}

	removeMiddlePoint(point: BoardPoint): void {
		const index = this.middlePoints.indexOf(point);
		if (index !== -1) {
			this.middlePoints.splice(index, 1);
		}
		this.updatePaths();
	}

	setStartPointerStyle(style: ConnectorPointerStyle): void {
		this.emit({
			class: "Connector",
			method: "setStartPointerStyle",
			item: [this.id],
			startPointerStyle: style,
		});
	}

	private applyStartPointerStyle(style: ConnectorPointerStyle): void {
		this.startPointerStyle = style;
		this.updatePaths();
	}

	setEndPointerStyle(style: ConnectorPointerStyle): void {
		this.emit({
			class: "Connector",
			method: "setEndPointerStyle",
			item: [this.id],
			endPointerStyle: style,
		});
	}

	private applyEndPointerStyle(style: ConnectorPointerStyle): void {
		this.endPointerStyle = style;
		this.updatePaths();
	}

	setLineColor(color: string): void {
		this.emit({
			class: "Connector",
			method: "setLineColor",
			item: [this.id],
			lineColor: color,
		});
	}

	private applyLineColor(color: string): void {
		this.lineColor = color;
	}

	setLineStyle(style: ConnectorLineStyle): void {
		this.emit({
			class: "Connector",
			method: "setLineStyle",
			item: [this.id],
			lineStyle: style,
		});
	}

	private applyLineStyle(style: ConnectorLineStyle): void {
		this.lineStyle = style;
		this.updatePaths();
	}

	setLineWidth(width: ConnectionLineWidth): void {
		this.emit({
			class: "Connector",
			method: "setLineWidth",
			item: [this.id],
			lineWidth: width,
		});
	}

	private applyLineWidth(width: ConnectionLineWidth): void {
		this.lineWidth = width;
		this.updatePaths();
	}

	getStartPoint(): ControlPoint {
		return this.startPoint;
	}

	getEndPoint(): ControlPoint {
		return this.endPoint;
	}

	getMiddlePoints(): BoardPoint[] {
		return this.middlePoints;
	}

	getMiddlePoint(): { x: number; y: number } {
		const line = this.lines.getSegments()[0];
		let x = 0;
		let y = 0;

		if (line instanceof CubicBezier) {
			const middle = line.getMiddle();
			x = middle.x;
			y = middle.y;
		} else {
			const start = this.startPoint;
			const end = this.endPoint;
			x = (start.x + end.x) / 2;
			y = (start.y + end.y) / 2;
		}

		return {
			x,
			y,
		};
	}

	getStartPointerStyle(): ConnectorPointerStyle {
		return this.startPointerStyle;
	}

	getEndPointerStyle(): ConnectorPointerStyle {
		return this.endPointerStyle;
	}

	getLineColor(): string {
		return this.lineColor;
	}

	getLineStyle(): ConnectorLineStyle {
		return this.lineStyle;
	}

	getLineWidth(): ConnectionLineWidth {
		return this.lineWidth;
	}

	getIntersectionPoints(segment: Line): Point[] {
		return this.lines.getIntersectionPoints(segment);
	}

	getMbr(): Mbr {
		return this.lines.getMbr();
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.lines.getNearestEdgePointTo(point);
	}

	isEnclosedOrCrossedBy(bounds: Mbr): boolean {
		return (
			this.lines.isEnclosedOrCrossedBy(bounds) ||
			this.startPointer.path.isEnclosedOrCrossedBy(bounds) ||
			this.endPointer.path.isEnclosedOrCrossedBy(bounds)
		);
	}

	isUnderPoint(point: Point): boolean {
		return (
			this.lines.isUnderPoint(point) ||
			this.startPointer.path.isUnderPoint(point) ||
			this.endPointer.path.isUnderPoint(point)
		);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return (
			this.lines.isNearPoint(point, distance) ||
			this.startPointer.path.isNearPoint(point, distance) ||
			this.endPointer.path.isNearPoint(point, distance)
		);
	}

	isEnclosedBy(bounds: Mbr): boolean {
		return (
			this.lines.isEnclosedBy(bounds) &&
			this.startPointer.path.isEnclosedBy(bounds) &&
			this.endPointer.path.isEnclosedBy(bounds)
		);
	}

	isInView(view: Mbr): boolean {
		return (
			this.lines.isInView(view) ||
			this.startPointer.path.isInView(view) ||
			this.endPointer.path.isInView(view)
		);
	}

	getNormal(point: Point): GeometricNormal {
		return this.lines.getNormal(point);
	}

	render(context: DrawingContext): void {
		this.clipText(context);
		this.text.render(context);
		this.startPointer.path.render(context);
		this.endPointer.path.render(context);
	}

	clipText(context: DrawingContext): void {
		if (DRAW_TEXT_BORDER) {
			this.lines.setBorderWidth(this.lineWidth);
			this.lines.setBorderColor(this.lineColor);
		}
		if (this.text.isEmpty()) {
			this.lines.render(context);
			return;
		}
		const ctx = context.ctx;

		const textMbr = this.text.getClipMbr();

		// Save the current context state
		ctx.save();

		// Define the exclusion path for clipping that's the inverse of the text bounding box
		ctx.beginPath();
		// Cover the entire canvas area with the rectangle path
		const cameraMbr = context.camera.getMbr();
		ctx.rect(
			cameraMbr.left,
			cameraMbr.top,
			cameraMbr.getWidth(),
			cameraMbr.getHeight(),
		);

		// Remove the text rectangle area from the path to create the exclusion/clipping area
		// This assumes a clockwise definition of the canvas rectangle and an anti-clockwise definition of the inner rectangle
		ctx.moveTo(
			textMbr.left - TEXT_BORDER_PADDING * 2,
			textMbr.top - TEXT_BORDER_PADDING * 2,
		);
		ctx.lineTo(
			textMbr.left - TEXT_BORDER_PADDING * 2,
			textMbr.bottom + TEXT_BORDER_PADDING * 2,
		);
		ctx.lineTo(
			textMbr.right + TEXT_BORDER_PADDING * 2,
			textMbr.bottom + TEXT_BORDER_PADDING * 2,
		);
		ctx.lineTo(
			textMbr.right + TEXT_BORDER_PADDING * 2,
			textMbr.top - TEXT_BORDER_PADDING * 2,
		);
		ctx.closePath();

		// Use the clip method to clip to the outside of the text rect
		ctx.clip("evenodd"); // 'evenodd' is a fill rule that allows us to subtract the text rect from the clip area

		// Render lines that won't appear inside the text rect
		this.lines.render(context);

		// Restore the context to remove the clipping region
		ctx.restore();

		if (
			DRAW_TEXT_BORDER &&
			this.board.selection.getContext() === "EditTextUnderPointer"
		) {
			ctx.strokeStyle = SELECTION_COLOR;
			ctx.beginPath();
			// Cover the entire canvas area with the rectangle path
			const cameraMbr = context.camera.getMbr();
			ctx.rect(
				cameraMbr.left,
				cameraMbr.top,
				cameraMbr.getWidth(),
				cameraMbr.getHeight(),
			);

			// Remove the text rectangle area from the path to create the exclusion/clipping area
			// This assumes a clockwise definition of the canvas rectangle and an anti-clockwise definition of the inner rectangle
			ctx.moveTo(
				textMbr.left - TEXT_BORDER_PADDING,
				textMbr.top - TEXT_BORDER_PADDING,
			);
			ctx.lineTo(
				textMbr.left - TEXT_BORDER_PADDING,
				textMbr.bottom + TEXT_BORDER_PADDING,
			);
			ctx.lineTo(
				textMbr.right + TEXT_BORDER_PADDING,
				textMbr.bottom + TEXT_BORDER_PADDING,
			);
			ctx.lineTo(
				textMbr.right + TEXT_BORDER_PADDING,
				textMbr.top - TEXT_BORDER_PADDING,
			);
			ctx.closePath();
			ctx.stroke();
		}
	}

	getPaths(): Path {
		return this.lines;
	}

	copyPaths(): Path {
		return this.lines.copy();
	}

	isClosed(): boolean {
		return false;
	}

	serialize(): ConnectorData {
		const text = this.text.serialize();
		text.transformation = undefined;
		const mbr = this.getMbr();
		const transformation = new Transformation();
		transformation.matrix.translateX = mbr.left;
		transformation.matrix.translateY = mbr.top;
		return {
			itemType: "Connector",
			transformation: transformation.serialize(),
			startPoint: this.startPoint.serialize(),
			endPoint: this.endPoint.serialize(),
			startPointerStyle: this.startPointerStyle,
			endPointerStyle: this.endPointerStyle,
			lineStyle: this.lineStyle,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			text: text,
		};
	}

	deserialize(data: Partial<ConnectorData>): this {
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		if (data.startPoint) {
			this.applyStartPoint(data.startPoint, false);
		}
		if (data.endPoint) {
			this.applyEndPoint(data.endPoint, false);
		}
		if (data.text) {
			this.text.deserialize(data.text);
		}
		this.startPointerStyle =
			data.startPointerStyle ?? this.startPointerStyle;
		this.endPointerStyle = data.endPointerStyle ?? this.endPointerStyle;
		this.lineStyle = data.lineStyle ?? this.lineStyle;
		this.lineColor = data.lineColor ?? this.lineColor;
		this.lineWidth = data.lineWidth ?? this.lineWidth;
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		this.transformBoardPoints();
		this.updatePaths();
		this.subject.publish(this);
		return this;
	}

	updateTitle(): void {
		if (!this.text) {
			return;
		}
		// if (this.animationFrameId) { return; }
		if (this.text!.isEmpty()) {
			return;
		}
		const { x, y } = this.getMiddlePoint();
		const height = this.text!.getHeight();
		const width = this.text!.getWidth();

		this.text.transformation.applyTranslateTo(
			x - width / 2,
			y - height / 2,
		);
		this.text.transformCanvas();

		// this.animationFrameId = 0;
	}

	private transformBoardPoints(): void {
		if (
			this.startPoint.pointType !== "Board" ||
			this.endPoint.pointType !== "Board"
		) {
			return;
		}

		const previous = this.transformation.previous.copy();
		previous.invert();
		const delta = previous.multiplyByMatrix(
			this.transformation.matrix.copy(),
		);

		const startPoint = new BoardPoint(this.startPoint.x, this.startPoint.y);
		startPoint.transform(delta);
		this.startPoint = startPoint;

		const endPoint = new BoardPoint(this.endPoint.x, this.endPoint.y);
		endPoint.transform(delta);
		this.endPoint = endPoint;
	}

	private updatePaths(): void {
		const startPoint = this.startPoint;
		const endPoint = this.endPoint;

		this.lines = getLine(
			this.lineStyle,
			startPoint,
			endPoint,
			this.middlePoints,
		).addConnectedItemType(this.itemType);
		this.startPointer = getStartPointer(
			startPoint,
			this.startPointerStyle,
			this.lineStyle,
			this.lines,
		);
		this.startPointer.path.setBorderColor(this.lineColor);
		this.startPointer.path.setBorderWidth(this.lineWidth);
		this.startPointer.path.setBackgroundColor(this.lineColor);
		this.endPointer = getEndPointer(
			endPoint,
			this.endPointerStyle,
			this.lineStyle,
			this.lines,
		);
		this.endPointer.path.setBorderColor(this.lineColor);
		this.endPointer.path.setBorderWidth(this.lineWidth);
		this.endPointer.path.setBackgroundColor(this.lineColor);

		this.offsetLines();

		this.updateTitle();
	}

	private offsetLines(): void {
		const line = this.lines.getSegments()[0];
		if (line instanceof Line) {
			this.lines = new Path([
				new Line(this.startPointer.start, this.endPointer.start),
			]).addConnectedItemType(this.itemType);
		} else if (line instanceof CubicBezier) {
			this.lines = new Path([
				new CubicBezier(
					this.startPointer.start,
					line.startControl,
					this.endPointer.start,
					line.endControl,
				),
			]).addConnectedItemType(this.itemType);
		}
	}

	getPath(): Path | Paths {
		return this.lines.copy();
	}

	getSnapAnchorPoints(): Point[] {
		const points: Point[] = [];
		for (const line of this.lines.getSegments()) {
			points.push(line.getCenterPoint());
		}
		return points;
	}
}
