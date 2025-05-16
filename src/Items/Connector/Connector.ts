import { RichText } from "Board/Items";
import { Subject } from "shared/Subject";
import { Board } from "../../Board";
import { Operation } from "../../Events";
import { CubicBezier } from "../Curve";
import { DrawingContext } from "../DrawingContext";
import { GeometricNormal } from "../GeometricNormal";
import { Item } from "../Item";
import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { BorderStyle, Path, Paths } from "../Path";
import { Point } from "../Point";
import { Matrix, Transformation } from "../Transformation";
import { ConnectorCommand } from "./ConnectorCommand";
import { ConnectorData, ConnectorOperation } from "./ConnectorOperations";
import {
	BoardPoint,
	ControlPoint,
	ControlPointData,
	FindItemFn,
	getControlPoint,
} from "./ControlPoint";
import { getLine } from "./getLine/getLine";
import { ConnectorEdge } from "./Pointers";
import { getStartPointer, getEndPointer } from "./Pointers/index";
import { ConnectorPointerStyle, Pointer } from "./Pointers/Pointers";
import { LinkTo } from "../LinkTo/LinkTo";
import {
	positionRelatively,
	resetElementScale,
	scaleElementBy,
} from "Board/HTMLRender";
import { DocumentFactory } from "Board/api/DocumentFactory";
import { ConnectorAnchorColors } from "./types";
import { conf } from "Board/Settings";
const { i18n } = conf;

export const ConnectorLineStyles = [
	"straight",
	"curved",
	"orthogonal",
] as const;

export type ConnectorLineStyle = (typeof ConnectorLineStyles)[number];

export const ConnectionLineWidths = [1, 2, 3, 4, 5, 6, 7, 8, 12] as const;

export type ConnectionLineWidth = (typeof ConnectionLineWidths)[number];

export const CONNECTOR_COLOR = "rgb(20, 21, 26)";
export const CONNECTOR_LINE_WIDTH = 1;
export const CONNECTOR_BORDER_STYLE: BorderStyle = "solid";
export const DEFAULT_END_POINTER = "TriangleFilled";
export const DRAW_TEXT_BORDER = false;
export const TEXT_BORDER_PADDING = 0;
export const CONNECTOR_ANCHOR_COLOR: ConnectorAnchorColors = {
	snapBorder: "rgb(71, 120, 245)",
	snapBackgroundHighlight: "rgba(0,0,0,0.1)",
	snapBackground: "rgba(0,0,0,0)",
	anchorBorder: "rgb(147, 175, 246)",
	anchorBackground: "rgb(255, 255, 255)",
	anchorHighlight: "rgb(255, 255, 255)",
	pointBorder: "rgb(147, 175, 246)",
	pointBackground: "rgb(147, 175, 246)",
};

export const CONNECTOR_ANCHOR_TYPE = "rect";
export const CONNECTOR_LINE_CAP = "round";
export class Connector {
	readonly itemType = "Connector";
	parent = "Board";
	private id = "";
	readonly transformation: Transformation;
	private middlePoint: ControlPoint | null = new BoardPoint();
	private lineColor: string;
	readonly linkTo: LinkTo;
	private lineWidth: ConnectionLineWidth;
	private borderStyle: BorderStyle;
	readonly subject = new Subject<Connector>();
	lines = new Path([new Line(new Point(), new Point())]);
	startPointer: Pointer;
	endPointer: Pointer;
	animationFrameId?: number;
	readonly text: RichText;
	transformationRenderBlock?: boolean = undefined;
	private optionalFindItemFn?: FindItemFn;
	constructor(
		private board: Board,
		private startPoint: ControlPoint = new BoardPoint(),
		private endPoint: ControlPoint = new BoardPoint(),
		private lineStyle: ConnectorLineStyle = "straight",
		private startPointerStyle: ConnectorPointerStyle = "None",
		private endPointerStyle: ConnectorPointerStyle = DEFAULT_END_POINTER,
		lineColor?: string,
		lineWidth?: ConnectionLineWidth,
		strokeStyle?: BorderStyle,
	) {
		this.transformation = new Transformation(this.id, this.board.events);
		this.linkTo = new LinkTo(this.id, this.board.events);
		this.lineColor = lineColor ?? CONNECTOR_COLOR;
		this.lineWidth = lineWidth ?? CONNECTOR_LINE_WIDTH;
		this.borderStyle = strokeStyle ?? CONNECTOR_BORDER_STYLE;
		this.text = new RichText(
			board,
			this.getMbr(),
			this.id,
			new Transformation(),
			this.linkTo,
			i18n.t("connector.textPlaceholder", {
				ns: "default",
			}),
			true,
			false,
			"Connector",
			{
				...conf.DEFAULT_TEXT_STYLES,
				fontSize:
					typeof window !== "undefined" &&
					localStorage.getItem("lastConnectorTextSize")
						? Number(localStorage.getItem("lastConnectorTextSize"))
						: conf.DEFAULT_TEXT_STYLES.fontSize,
				fontColor:
					typeof window !== "undefined" &&
					localStorage.getItem("lastConnectorTextColor")
						? localStorage.getItem("lastConnectorTextColor")
						: conf.DEFAULT_TEXT_STYLES.fontColor,
			},
		);
		this.startPointer = getStartPointer(
			this.startPoint,
			this.startPointerStyle,
			this.lineStyle,
			this.lines,
			this.lineWidth * 0.1 + 0.3,
		);
		this.endPointer = getEndPointer(
			this.endPoint,
			this.endPointerStyle,
			this.lineStyle,
			this.lines,
			this.lineWidth * 0.1 + 0.3,
		);
		this.middlePoint = null;

		this.transformation.subject.subscribe((_sub, op) => {
			if (op.method === "transformMany") {
				const operation = op.items[this.getId()];
				if (
					operation.method === "scaleByTranslateBy" &&
					(operation.scale.x !== 1 || operation.scale.y !== 1)
				) {
					this.scalePoints();
				}
			}
			this.translatePoints();
			this.updatePaths();
			this.subject.publish(this);
		});
		this.linkTo.subject.subscribe(() => {
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

	clearObservedItems() {
		const startPoint = this.getStartPoint();
		const endPoint = this.getEndPoint();

		if (startPoint.pointType !== "Board") {
			this.unsubscribeFromItem(startPoint, this.observerStartPointItem);
		}

		if (endPoint.pointType !== "Board") {
			this.unsubscribeFromItem(endPoint, this.observerEndPointItem);
		}
	}

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
		if (this.board.events) {
			const command = new ConnectorCommand([this], operation);
			command.apply();
			this.board.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	setId(id: string): this {
		this.id = id;
		this.text.setId(id);
		this.linkTo.setId(id);
		// this.text.addConnector(id);
		this.transformation.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	apply(operation: Operation): void {
		switch (operation.class) {
			case "RichText":
				this.text.apply(operation);
				break;
			case "Connector":
				switch (operation.method) {
					case "setStartPoint":
						this.applyStartPoint(operation.startPointData);
						break;
					case "setEndPoint":
						this.applyEndPoint(operation.endPointData);
						break;
					case "setMiddlePoint":
						this.applyMiddlePoint(operation.middlePointData);
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
					case "setBorderStyle":
						this.applyBorderStyle(operation.borderStyle);
						break;
					case "setLineColor":
						this.applyLineColor(operation.lineColor);
						break;
					case "setLineWidth":
						this.applyLineWidth(operation.lineWidth);
						break;
					case "switchPointers":
						this.applySwitchPointers();
						break;
				}
				break;
			// case "Transformation":
			// 	this.transformation.apply(operation);
			// 	break;
			case "LinkTo":
				this.linkTo.apply(operation);
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

	setStartPoint(
		point: ControlPoint | ControlPointData,
		timestamp?: number,
	): void {
		this.emit({
			class: "Connector",
			method: "setStartPoint",
			item: [this.id],
			startPointData: "serialize" in point ? point.serialize() : point,
			timestamp,
		});
	}

	applyStartPoint(pointData: ControlPointData, updatePath = true): void {
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

	setEndPoint(
		point: ControlPoint | ControlPointData,
		timestamp?: number,
	): void {
		this.emit({
			class: "Connector",
			method: "setEndPoint",
			item: [this.id],
			endPointData: "serialize" in point ? point.serialize() : point,
			timestamp,
		});
	}

	applyEndPoint(pointData: ControlPointData, updatePath = true): void {
		this.unsubscribeFromItem(this.endPoint, this.observerEndPointItem);
		const optionalFn = this.getOptionalFindFn();
		this.endPoint = getControlPoint(
			pointData,
			optionalFn
				? optionalFn
				: itemId => this.board.items.findById(itemId),
		);
		this.subscribeToItem(this.endPoint, this.observerEndPointItem);
		if (updatePath) {
			this.updatePaths();
		}
	}

	applyMiddlePoint(pointData: ControlPointData, updatePath = true): void {
		// console.log("pointData", pointData);
		const optionalFn = this.getOptionalFindFn();
		this.middlePoint = getControlPoint(
			pointData,
			optionalFn
				? optionalFn
				: itemId => this.board.items.findById(itemId),
		);
		if (updatePath) {
			this.updatePaths();
		}
	}

	private applySwitchPointers(): void {
		const temp = this.startPointerStyle;
		this.startPointerStyle = this.endPointerStyle;
		this.endPointerStyle = temp;
		this.updatePaths();
	}

	addMiddlePoint(point: BoardPoint): void {
		this.middlePoint = point;
		this.updatePaths();
	}

	setMiddlePoint(
		point: ControlPoint | ControlPointData,
		timestamp?: number,
	): void {
		this.emit({
			class: "Connector",
			method: "setMiddlePoint",
			item: [this.id],
			middlePointData: "serialize" in point ? point.serialize() : point,
			timestamp,
		});
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
		this.updatePaths();
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

	private setBorderStyle(style: BorderStyle): void {
		this.emit({
			class: "Connector",
			method: "setBorderStyle",
			item: [this.id],
			borderStyle: style,
		});
	}

	private applyBorderStyle(style: BorderStyle): void {
		this.borderStyle = style;
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

	getMiddlePoint(): ControlPoint | null {
		return this.middlePoint;
	}

	calculateMiddlePoint(): { x: number; y: number } {
		if (this.lineStyle === "orthogonal") {
			const segments = this.lines.getSegments();
			const middle = segments[Math.floor(segments.length / 2)];
			return {
				x: (middle.start.x + middle.end.x) / 2,
				y: (middle.start.y + middle.end.y) / 2,
			};
		}

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

	getBorderStyle(): BorderStyle {
		return this.borderStyle;
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
			this.endPointer.path.isEnclosedOrCrossedBy(bounds) ||
			this.text.isEnclosedOrCrossedBy(bounds)
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

	isConnected() {
		return (
			this.startPoint.pointType !== "Board" &&
			this.endPoint.pointType !== "Board"
		);
	}

	getConnectedItems(): { startItem?: Item; endItem?: Item } {
		const connectedItems: { startItem?: Item; endItem?: Item } = {
			startItem: undefined,
			endItem: undefined,
		};
		if (this.startPoint.pointType !== "Board") {
			connectedItems.startItem = this.startPoint.item;
		}
		if (this.endPoint.pointType !== "Board") {
			connectedItems.endItem = this.endPoint.item;
		}
		return connectedItems;
	}

	isConnectedOnePoint(): boolean {
		return (
			this.startPoint.pointType !== "Board" ||
			this.endPoint.pointType !== "Board"
		);
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		if (CONNECTOR_LINE_CAP === "round") {
			context.ctx.lineCap = "round";
			context.ctx.lineJoin = "round";
		}
		const mbr = this.getMbr();
		mbr.borderColor = "red";
		mbr.strokeWidth = 3;
		mbr.borderStyle = "solid";
		// mbr.render(context)
		this.clipText(context);
		if (
			!this.text.isRenderEnabled &&
			this.board.selection.getContext() !== "EditTextUnderPointer"
		) {
			this.lines.render(context);
		}
		if (this.startPointerStyle !== "None") {
			this.startPointer.path.render(context);
		}
		if (this.endPointerStyle !== "None") {
			this.endPointer.path.render(context);
		}
		if (this.getLinkTo()) {
			const { top, right } = this.endPointer.path.getMbr();
			this.linkTo.render(
				context,
				top,
				right,
				this.board.camera.getScale(),
			);
		}
	}

	clipText(context: DrawingContext): void {
		const selectionContext = this.board.selection.getContext();
		if (
			this.text.isEmpty() &&
			!this.board.selection.items.list().includes(this)
		) {
			this.text.disableRender();
			this.lines.render(context);
			return;
		}

		if (
			this.text.isEmpty() &&
			this.board.selection.items.list().includes(this) &&
			(selectionContext === "SelectUnderPointer" ||
				selectionContext === "EditUnderPointer" ||
				selectionContext === "SelectByRect")
		) {
			this.text.disableRender();
			this.lines.render(context);

			return;
		}
		const ctx = context.ctx;
		// this.text.enableRender();
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

		// Render text in the center of the connector
		const { x, y } = this.calculateMiddlePoint();
		const textWidth = this.text.getWidth();
		const textHeight = this.text.getHeight();
		this.text.transformation.applyTranslateTo(
			x - textWidth / 2,
			y - textHeight / 2,
		);

		this.text.render(context);

		if (
			DRAW_TEXT_BORDER &&
			(selectionContext === "EditUnderPointer" ||
				selectionContext === "EditTextUnderPointer") &&
			this.board.selection.items.list().includes(this)
		) {
			ctx.strokeStyle = conf.SELECTION_COLOR;
			ctx.lineWidth = 1;
			ctx.beginPath();
			// Draw border around the text only
			ctx.rect(
				textMbr.left - TEXT_BORDER_PADDING,
				textMbr.top - TEXT_BORDER_PADDING,
				textMbr.getWidth() + TEXT_BORDER_PADDING * 2,
				textMbr.getHeight() + TEXT_BORDER_PADDING * 2,
			);
			ctx.closePath();
			ctx.stroke();
		}
	}
	// smell have to redo without document
	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("connector-item");

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

		// todo fix clip
		// const clip = documentFactory.createElementNS("http://www.w3.org/2000/svg", "clipPath");
		// const clip = documentFactory.createElementNS("http://www.w3.org/2000/svg", "mask");
		// clip.setAttribute("id", `${this.getId()}_clip`);

		// const textMbr = this.text.getTransformedContainer();
		// const rect = documentFactory.createElementNS("http://www.w3.org/2000/svg", "rect");
		// rect.setAttribute("x", `${textMbr.left}`);
		// rect.setAttribute("y", `${textMbr.top}`);
		// rect.setAttribute("width", `${textMbr.getWidth()}`);
		// rect.setAttribute("height", `${textMbr.getHeight()}`);
		// rect.setAttribute(
		// 	"transform",
		// 	`translate(${-translateX}, ${-translateY}) scale(${1 / scaleX}, ${1 / scaleY})`,
		// );
		// rect.setAttribute("fill", "black");

		// const fullRect = documentFactory.createElementNS("http://www.w3.org/2000/svg", "rect");
		// fullRect.setAttribute("x", `${this.getMbr().left}`);
		// fullRect.setAttribute("y", `${this.getMbr().top}`);
		// fullRect.setAttribute("width", `${this.getMbr().getWidth()}`);
		// fullRect.setAttribute("height", `${this.getMbr().getHeight()}`);
		// fullRect.setAttribute(
		// 	"transform",
		// 	`translate(${-translateX}, ${-translateY}) scale(${1 / scaleX}, ${1 / scaleY})`,
		// );
		// fullRect.setAttribute("fill", "white");

		// clip.appendChild(fullRect);
		// clip.appendChild(rect);
		// svg.appendChild(clip);
		// svg.setAttribute("clip-path", `url(#${this.getId()}_clip)`);
		// svg.setAttribute("mask", `url(#${this.getId()}_clip)`);

		const lines = this.renderPathHTML(documentFactory, this.lines);
		svg.append(...lines);

		if (this.getStartPointerStyle() !== "None") {
			const startPointer = this.renderPathHTML(
				documentFactory,
				this.startPointer.path,
			);
			if (
				!(
					this.startPointer.name.toLowerCase().includes("filled") ||
					this.startPointer.name.toLowerCase().includes("arrow")
				)
			) {
				startPointer.forEach(el => el.setAttribute("fill", "none"));
			}
			svg.append(...startPointer);
		}
		if (this.getEndPointerStyle() !== "None") {
			const endPointer = this.renderPathHTML(
				documentFactory,
				this.endPointer.path,
			);
			if (
				!(
					this.endPointer.name.toLowerCase().includes("filled") ||
					this.endPointer.name.toLowerCase().includes("arrow")
				)
			) {
				endPointer.forEach(el => el.setAttribute("fill", "none"));
			}
			svg.append(...endPointer);
		}

		div.appendChild(svg);

		div.id = this.getId();
		div.style.width = unscaledWidth + "px";
		div.style.height = unscaledHeight + "px";
		div.style.transformOrigin = "left top";
		div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
		div.style.position = "absolute";
		div.setAttribute("data-line-color", this.lineColor);
		div.setAttribute("data-line-width", this.lineWidth.toString());
		div.setAttribute("data-line-style", this.lineStyle);
		div.setAttribute("data-border-style", this.borderStyle);

		const setPointAttributes = (
			div: HTMLElement,
			point: ControlPoint,
			variant: "start" | "end",
		): void => {
			const prefix = `data-${variant}-point`;
			div.setAttribute(
				`${prefix}er-style`,
				variant === "start"
					? this.getStartPointerStyle()
					: this.getEndPointerStyle(),
			);
			div.setAttribute(`${prefix}-type`, point.pointType);
			div.setAttribute(
				`${prefix}-item`,
				(point.pointType !== "Board" && point.item.getId()) || "",
			);
			div.setAttribute(
				`${prefix}-relative-x`,
				("relativePoint" in point &&
					point.relativePoint.x.toString()) ||
					"",
			);
			div.setAttribute(
				`${prefix}-relative-y`,
				("relativePoint" in point &&
					point.relativePoint.y.toString()) ||
					"",
			);
			div.setAttribute(`${prefix}-x`, point.x.toString());
			div.setAttribute(`${prefix}-y`, point.y.toString());

			if (point.pointType === "FixedConnector") {
				div.setAttribute(`${prefix}-tangent`, point.tangent.toString());
				div.setAttribute(
					`${prefix}-segment`,
					point.segmentIndex.toString(),
				);
			}
		};

		setPointAttributes(div, this.startPoint, "start");
		setPointAttributes(div, this.endPoint, "end");

		const textElement = this.text.renderHTML(documentFactory, false);
		textElement.id = `${this.getId()}_text`;
		textElement.style.overflow = "auto";
		positionRelatively(textElement, div);
		resetElementScale(textElement);
		scaleElementBy(textElement, 1 / scaleX, 1 / scaleY);
		div.appendChild(textElement);
		div.setAttribute("data-link-to", this.linkTo.serialize() || "");

		return div;
	}

	private renderPathHTML(
		documentFactory: DocumentFactory,
		path: Path | Paths,
	): SVGPathElement[] {
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		const pathElement = path.renderHTML(documentFactory);
		const paths = Array.isArray(pathElement) ? pathElement : [pathElement];

		paths.forEach(element => {
			element.setAttribute(
				"transform",
				`translate(${-translateX}, ${-translateY}) scale(${1 / scaleX}, ${1 / scaleY})`,
			);
			// element.setAttribute("clip", `url(#${this.getId()}_clip)`);
		});

		return Array.isArray(pathElement) ? pathElement : [pathElement];
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
			middlePoint: this.middlePoint ? this.middlePoint.serialize() : null,
			startPointerStyle: this.startPointerStyle,
			endPointerStyle: this.endPointerStyle,
			lineStyle: this.lineStyle,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			text: text,
			borderStyle: this.borderStyle,
			linkTo: this.linkTo.serialize(),
		};
	}

	deserialize(data: Partial<ConnectorData>): this {
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		if (data.optionalFindItemFn) {
			this.setOptionalFindFn(data.optionalFindItemFn);
		}
		if (data.startPoint) {
			this.applyStartPoint(data.startPoint, false);
		}
		if (data.endPoint) {
			this.applyEndPoint(data.endPoint, false);
		}
		if (data.middlePoint) {
			this.applyMiddlePoint(data.middlePoint, false);
		}
		if (data.text) {
			this.text.deserialize(data.text);
		}
		const linkTo = data.linkTo;
		if (linkTo) {
			this.linkTo.deserialize(
				typeof linkTo === "string" ? linkTo : linkTo.link,
			);
		}
		this.startPointerStyle =
			data.startPointerStyle ?? this.startPointerStyle;
		this.endPointerStyle = data.endPointerStyle ?? this.endPointerStyle;
		this.lineStyle = data.lineStyle ?? this.lineStyle;
		this.lineColor = data.lineColor ?? this.lineColor;
		this.lineWidth = data.lineWidth ?? this.lineWidth;
		this.borderStyle = data.borderStyle ?? this.borderStyle;
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		this.translatePoints();
		this.updatePaths();
		this.subject.publish(this);
		return this;
	}

	getConnectorById(
		items: Item[],
		connectorId: string,
	): Connector | undefined {
		return items.find(
			item => item instanceof Connector && item.getId() === connectorId,
		) as Connector;
	}

	updateTitle(): void {
		const selection = this.board.selection;
		const isConnectorSelected = selection.items.findById(this.id);
		if (
			isConnectorSelected &&
			this.board.selection.getContext() === "EditTextUnderPointer"
		) {
			this.text.isRenderEnabled = false;
		} else {
			this.text.isRenderEnabled = true;
		}
		if (!this.text) {
			return;
		}
		const { x, y } = this.getMiddlePoint() || this.calculateMiddlePoint();
		const height = this.text!.getHeight();
		const width = this.text!.getWidth();

		this.text.transformation.applyTranslateTo(
			x - width / 2,
			y - height / 2,
		);
		this.text.updateElement();

		// this.animationFrameId = 0;
	}

	private scalePoints(): void {
		const origin = new Point(this.getMbr().left, this.getMbr().top);
		const previous = this.transformation.previous.copy();
		previous.translateX = 0;
		previous.translateY = 0;
		previous.invert();
		const currUnscaled = this.transformation.matrix.copy();
		currUnscaled.translateX = 0;
		currUnscaled.translateY = 0;
		const delta = previous.multiplyByMatrix(currUnscaled);
		this.scalePoint(this.startPoint, origin, delta, "start");
		this.scalePoint(this.endPoint, origin, delta, "end");
	}

	private scalePoint(
		point: ControlPoint,
		origin: Point,
		scaleMatrix: Matrix,
		edge: ConnectorEdge,
	): void {
		if (point.pointType !== "Board") {
			return;
		}
		const deltaX = point.x - origin.x;
		const deltaY = point.y - origin.y;
		// need to replace with getProportionalResize or fix connector transformation in getProportionalResize
		const scaledX = origin.x + deltaX * scaleMatrix.scaleX;
		const scaledY = origin.y + deltaY * scaleMatrix.scaleY;

		const newPoint = new BoardPoint(scaledX, scaledY);
		if (edge === "start") {
			this.startPoint = newPoint;
		} else {
			this.endPoint = newPoint;
		}
	}

	private translatePoints(): void {
		const previous = this.transformation.previous.copy();
		previous.scaleX = 1;
		previous.scaleY = 1;
		previous.invert();
		const currUnscaled = this.transformation.matrix.copy();
		currUnscaled.scaleX = 1;
		currUnscaled.scaleY = 1;
		const delta = previous.multiplyByMatrix(currUnscaled);
		this.translatePoint(this.startPoint, delta, "start");
		this.translatePoint(this.endPoint, delta, "end");
	}

	private translatePoint(
		point: ControlPoint,
		delta: Matrix,
		edge: ConnectorEdge,
	): void {
		if (point.pointType !== "Board") {
			return;
		}
		const newPoint = new BoardPoint(point.x, point.y);
		newPoint.transform(delta);
		if (edge === "start") {
			this.startPoint = newPoint;
		} else if (edge === "middle") {
			this.middlePoint = newPoint;
		} else {
			this.endPoint = newPoint;
		}
	}

	private updatePaths(): void {
		if (conf.isNode()) {
			return;
		}
		const startPoint = this.startPoint;
		const endPoint = this.endPoint;
		this.lines = getLine(
			this.lineStyle,
			startPoint,
			endPoint,
			this.middlePoint,
		).addConnectedItemType(this.itemType);

		this.startPointer = getStartPointer(
			startPoint,
			this.startPointerStyle,
			this.lineStyle,
			this.lines,
			this.lineWidth * 0.1 + 0.2,
		);
		this.startPointer.path.setBorderColor(this.lineColor);
		this.startPointer.path.setBorderWidth(this.lineWidth);
		this.startPointer.path.setBackgroundColor(this.lineColor);
		this.endPointer = getEndPointer(
			endPoint,
			this.endPointerStyle,
			this.lineStyle,
			this.lines,
			this.lineWidth * 0.1 + 0.2,
		);
		this.endPointer.path.setBorderColor(this.lineColor);
		this.endPointer.path.setBorderWidth(this.lineWidth);
		this.endPointer.path.setBackgroundColor(this.lineColor);

		this.offsetLines();

		this.lines.setBorderWidth(this.lineWidth);
		this.lines.setBorderColor(this.lineColor);
		this.lines.setBorderStyle(this.borderStyle);

		this.updateTitle();
	}

	private offsetLines(): void {
		const segments = this.lines.getSegments();
		const line = segments[0];
		if (this.lineStyle === "orthogonal") {
			if (this.startPoint.pointType !== "Board") {
				this.lines = new Path([
					new Line(this.startPointer.start, line.start),
					...segments,
				]).addConnectedItemType(this.itemType);
			} else {
				this.lines = new Path([
					new Line(this.startPointer.start, line.end),
					...segments.slice(1),
				]).addConnectedItemType(this.itemType);
			}
			const updated = this.lines.getSegments();
			const lastLine = updated[updated.length - 1];
			if (this.endPoint.pointType !== "Board") {
				this.lines = new Path([
					...updated,
					new Line(lastLine.end, this.endPointer.start),
				]).addConnectedItemType(this.itemType);
			} else {
				this.lines = new Path([
					...updated.slice(0, updated.length - 1),
					new Line(lastLine.start, this.endPointer.start),
				]).addConnectedItemType(this.itemType);
			}
		} else if (line instanceof Line) {
			if (this.middlePoint) {
				this.lines = new Path([
					new Line(this.startPointer.start, this.middlePoint),
					new Line(this.middlePoint, this.endPointer.start),
				]).addConnectedItemType(this.itemType);
			} else {
				this.lines = new Path([
					new Line(this.startPointer.start, this.endPointer.start),
				]).addConnectedItemType(this.itemType);
			}
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

	getOptionalFindFn(): FindItemFn | undefined {
		return this.optionalFindItemFn;
	}

	setOptionalFindFn(value: FindItemFn | undefined): void {
		this.optionalFindItemFn = value;
	}

	hasText(): boolean {
		return !this.text.isEmpty();
	}

	getRichText(): RichText {
		return this.text;
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}
}
export const CONNECTOR_POINTER_TYPES = [
	"None",
	"ArrowBroad",
	"ArrowThin",
	"TriangleFilled",
	"CircleFilled",
	"Angle",
	"TriangleEmpty",
	"DiamondFilled",
	"DiamondEmpty",
	"Zero",
	"One",
	"Many",
	"ManyMandatory",
	"OneMandatory",
	"ManyOptional",
	"OneOptional",
] as const;
