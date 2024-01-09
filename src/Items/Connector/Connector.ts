import { RichText } from 'Board/Items';
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
	private title?: RichText;
	private titleDebounceTime: number = Date.now();
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
		this.board.items
			.listAll()
			.filter((item) => item.itemType === 'RichText')
			.find((item: RichText) => item.getConnectedItem() === this.id)
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
        if (point.pointType === "Board" && this.shouldTransform()) {
            point.transform(this.transformation.matrix.getInverse());
        }
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
        if (point.pointType === "Board" && this.shouldTransform()) {
            point.transform(this.transformation.matrix.getInverse());
        }
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
        if (this.startPoint.pointType === "Board") {
            const point = this.startPoint.copy();
            point.transform(this.transformation.matrix);
            return new BoardPoint(point.x, point.y);
        } else {
            return this.startPoint;
        }
    }

    getEndPoint(): ControlPoint {
        if (this.endPoint.pointType === "Board") {
            const point = this.endPoint.copy();
            point.transform(this.transformation.matrix);
            return new BoardPoint(point.x, point.y);
        } else {
            return this.endPoint;
        }
    }

    getMiddlePoints(): BoardPoint[] {
        return this.middlePoints;
    }

	getMiddlePoint(): {x: number; y: number} {
        const line = this.lines.getSegments()[0];
        let x = 0;
        let y = 0;
        if (line instanceof CubicBezier) {
            const x0 = line.start.x;
            const y0 = line.start.y;
            const x1 = line.startControl.x;
            const y1 = line.startControl.y;
            const x2 = line.endControl.x;
            const y2 = line.endControl.y;
            const x3 = line.end.x;
            const y3 = line.end.y;

            // Calculate center point at t=0.5
            const tt = 0.5;
            x = Math.pow(1 - tt, 3) * x0 + 3 * tt * Math.pow(1 - tt, 2) * x1 + 3 * Math.pow(tt, 2) * (1 - tt) * x2 + Math.pow(tt, 3) * x3;
            y = Math.pow(1 - tt, 3) * y0 + 3 * tt * Math.pow(1 - tt, 2) * y1 + 3 * Math.pow(tt, 2) * (1 - tt) * y2 + Math.pow(tt, 3) * y3;
        } else {
            const start = this.startPoint;
            const end = this.endPoint;
            x = (start.x + end.x) / 2;
            y = (start.y + end.y) / 2;
        }
		
		return {
			x,
			y
		}
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

	createTitle(): void {
		const {x, y} = this.getMiddlePoint();
		const text = this.board.add(
            new RichText(
                this.getMbr(),
                this.id,
                this.events,
                this.transformation,
                "\u00A0",
                true
            )
            .setMaxWidth(300)
            .setConnectedItem(this.id)
        );
        text.placeholderText = "\u00A0"
        const textHeight = text.getHeight();
        const textWidth = text.getWidth();
        text.setSelectionHorisontalAlignment('left');
        text.editor.setSelectionHorisontalAlignment('left');
        text.transformation.translateTo(x - textWidth/2, y - textHeight/2);
		text.transformation.scaleBy(1, 1);
        text.setMaxWidth(300);
		this.board.tools.select();
		this.board.tools.publish();
		this.board.selection.removeAll();
		this.board.selection.add(text);
		this.board.selection.setContext("EditTextUnderPointer");
		this.board.tools.select();
		this.board.tools.publish();
		this.board.selection.editSelected();
		this.title = text;
	}

	setTitle(title: RichText): this {
		this.title = title;
        this.title.placeholderText = "\u00A0";
		return this;
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

    updateTitle(): void {
        if (!this.title) {return};
        const now = Date.now();
        const fps60 = 1000 / 60;
        if (now - this.titleDebounceTime < fps60 ) {return;}
        this.titleDebounceTime = now;
        const {x, y} = this.getMiddlePoint();
        const height = this.title.getHeight();
        const width = this.title.getWidth();
        this.title.transformation.translateTo(x - width/2, y - height/2);
    }

    private updatePaths(): void {
        const matrix = this.transformation.matrix;
        let startPoint = this.startPoint;
        let endPoint = this.endPoint;

        if (this.startPoint.pointType === "Board") {
            startPoint = new BoardPoint(startPoint.x, startPoint.y);
            startPoint.transform(matrix);
        }

        if (this.endPoint.pointType === "Board") {
            endPoint = new BoardPoint(endPoint.x, endPoint.y);
            endPoint.transform(matrix);
        }

        this.updateTitle();

        this.lines = getLine(
            this.lineStyle,
            startPoint,
            endPoint,
            this.middlePoints,
        );
        this.startPointer = getStartPointer(
            startPoint,
            this.startPointerStyle,
            this.lineStyle,
            this.lines,
        );
        this.startPointer.path.setBackgroundColor(this.lineColor);
        this.endPointer = getEndPointer(
            endPoint,
            this.endPointerStyle,
            this.lineStyle,
            this.lines,
        );
        this.endPointer.path.setBackgroundColor(this.lineColor);

        this.offsetLines();
    }

    private shouldTransform(): boolean {
        return (this.startPoint.pointType === "Board" &&
            this.endPoint.pointType === "Board");
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
