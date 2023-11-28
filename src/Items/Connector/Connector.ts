import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { DrawingContext } from "../DrawingContext";
import { ConnectorData, ConnectorOperation } from "./ConnectorOperations";
import { Path, Paths } from "../Path";
import { Matrix, Transformation } from "../Transformation";
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
	private startPointerStyle = "none";
	private endPointerStyle = "TriangleFilled";
	private lineColor = "black";
	private lineStyle: ConnectorLineStyle = "straight";
	private lineWidth: ConnectionLineWidth = 1;
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
	inverse = new Matrix();

	constructor(
		private board: Board,
		private events?: Events,
		private startPoint: ControlPoint = new BoardPoint(),
		private endPoint: ControlPoint = new BoardPoint(),
	) {
		this.transformation.subject.subscribe(() => {
			this.updatePaths();
			this.subject.publish(this);
		});
		this.offsetLines();
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

	setStartPointerStyle(style: string): void {
		this.emit({
			class: "Connector",
			method: "setStartPointerStyle",
			item: [this.id],
			startPointerStyle: style,
		});
	}

	private applyStartPointerStyle(style: string): void {
		this.startPointerStyle = style;
		this.updatePaths();
	}

	setEndPointerStyle(style: string): void {
		this.emit({
			class: "Connector",
			method: "setEndPointerStyle",
			item: [this.id],
			endPointerStyle: style,
		});
	}

	private applyEndPointerStyle(style: string): void {
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

	getStartPointerStyle(): string {
		return this.startPointerStyle;
	}

	getEndPointerStyle(): string {
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
		this.lines.render(context);
		this.startPointer.path.render(context);
		this.endPointer.path.render(context);
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
		return {
			itemType: "Connector",
			transformation: this.transformation.serialize(),
			startPoint: this.startPoint.serialize(),
			endPoint: this.endPoint.serialize(),
			startPointerStyle: this.startPointerStyle,
			endPointerStyle: this.endPointerStyle,
			lineStyle: this.lineStyle,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
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
		this.startPointerStyle =
			data.startPointerStyle ?? this.startPointerStyle;
		this.endPointerStyle = data.endPointerStyle ?? this.endPointerStyle;
		this.lineStyle = data.lineStyle ?? this.lineStyle;
		this.lineColor = data.lineColor ?? this.lineColor;
		this.lineWidth = data.lineWidth ?? this.lineWidth;
		this.updatePaths();
		this.subject.publish(this);
		return this;
	}

	private updatePaths(): void {
		this.lines = getLine(
			this.lineStyle,
			this.startPoint,
			this.endPoint,
			this.middlePoints,
		);
		this.startPointer = getStartPointer(
			this.startPoint,
			this.startPointerStyle,
			this.lineStyle,
			this.lines,
		);
		this.startPointer.path.setBackgroundColor(this.lineColor);
		this.endPointer = getEndPointer(
			this.endPoint,
			this.endPointerStyle,
			this.lineStyle,
			this.lines,
		);
		this.endPointer.path.setBackgroundColor(this.lineColor);

		this.offsetLines();

		if (
			this.startPoint.pointType === "Board" &&
			this.endPoint.pointType === "Board"
		) {
			const matrix = this.transformation.matrix.copy();
			matrix.multiply(this.inverse);
			this.lines.transform(matrix);
			this.startPointer.path.transform(matrix);
			this.endPointer.path.transform(matrix);
			this.inverse = this.transformation.matrix.getInverse();
		}
	}

	private offsetLines(): void {
		const line = this.lines.getSegments()[0];
		if (line instanceof Line) {
			this.lines = new Path([
				new Line(this.startPointer.start, this.endPointer.start),
			]);
		} else if (line instanceof CubicBezier) {
			this.lines = new Path([
				new CubicBezier(
					this.startPointer.start,
					line.startControl,
					this.endPointer.start,
					line.endControl,
				),
			]);
		}
	}

	getPath(): Path | Paths {
		return this.lines.copy();
	}

	getSnapAnchorPoints(): Point[] {
		const points = [];
		for (const line of this.lines.getSegments()) {
			points.push(line.getCenterPoint());
		}
		return points;
	}
}
