import { RichText } from 'Items/RichText/RichText';
import { Subject } from 'Subject';
import { Board } from 'Board';
import { Operation, BaseOperation } from 'Events';
import { CubicBezier } from 'Geometry/Curve/Curve';
import { DrawingContext } from 'Geometry/DrawingContext';
import { GeometricNormal } from 'Geometry/GeometricNormal';
import type { Item } from '../Item';
import { Line } from 'Geometry/Line/Line';
import { Mbr } from 'Geometry/Mbr/Mbr';
import { Path } from 'Geometry/Path/Path';
import { Paths } from 'Geometry/Path/Paths';
import type { BorderStyle } from 'Geometry/Path/Path';
import { Point } from 'Geometry/Point/Point';
import { Matrix } from 'Geometry/Transformation/Matrix';
import { Transformation } from 'Geometry/Transformation/Transformation';
import { Geometry } from 'Geometry/Geometry';
import { ConnectorCommand } from './ConnectorCommand';
import { ConnectorData, ConnectorOperation } from './ConnectorOperations';
import {
	BoardPoint,
	ControlPoint,
	ControlPointData,
	FindItemFn,
	FixedPoint,
	getControlPoint,
	toRelativePoint,
} from './ControlPoint';
import { TransformationOperation } from 'Geometry/Transformation/TransformationOperations';

import { getLine } from './getLine/getLine';
import { ConnectorEdge } from './Pointers';
import { getStartPointer, getEndPointer } from './Pointers/index';
import { ConnectorPointerStyle, Pointer } from './Pointers/Pointers';
import { LinkTo } from '../LinkTo/LinkTo';
import { ConnectorAnchorColors } from './types';
import { conf } from 'Settings';
import { transformOps } from "Geometry/Transformation/transformOps";
import { BaseItem, SerializedItemData, BaseItemData } from "../BaseItem/BaseItem";
import { BaseItemOperation } from "../BaseItem/BaseItemOperation";
import { UpdateHint } from "../BaseItem/UpdateHint";
import { Group } from "../Group/Group";
import { ColorValue, coerceColorValue, resolveColor, fixedColor, semanticColor } from 'Color';

import {
	ConnectionLineWidth,
	ConnectorLineStyle,
	CONNECTOR_LINE_WIDTH,
	CONNECTOR_BORDER_STYLE,
	DEFAULT_END_POINTER,
	CONNECTOR_POINTER_TYPES,
} from './ConnectorTypes';
import { connectorOverlay } from "./ConnectorOverlay";
import { connectorOps } from './connectorOps';
import { registerItem } from '../RegisterItem';
import { ConnectorDataSchema } from './Connector.schema';
import { SessionStorage } from 'SessionStorage';
const DRAW_TEXT_BORDER = false;
const TEXT_BORDER_PADDING = 0;
export const CONNECTOR_ANCHOR_COLOR: ConnectorAnchorColors = {
	snapBorder: 'rgb(71, 120, 245)',
	snapBackgroundHighlight: 'rgba(0,0,0,0.1)',
	snapBackground: 'rgba(0,0,0,0)',
	anchorBorder: 'rgb(147, 175, 246)',
	anchorBackground: 'rgb(255, 255, 255)',
	anchorHighlight: 'rgb(255, 255, 255)',
	pointBorder: 'rgb(147, 175, 246)',
	pointBackground: 'rgb(147, 175, 246)',
};

export const CONNECTOR_ANCHOR_TYPE = 'rect';
const CONNECTOR_LINE_CAP = 'round';
export class Connector extends BaseItem<Connector> {
	readonly itemType = 'Connector';
	parent = 'Board';
	private middlePoint: ControlPoint | null = new BoardPoint();
	private lineColor: ColorValue;
	private smartJump = true;
	private lineWidth: ConnectionLineWidth;
	borderStyle: BorderStyle;
	readonly subject = new Subject<Connector>();
	lines = new Path([new Line(new Point(), new Point())]);
	startPointer: Pointer;
	endPointer: Pointer;
	animationFrameId?: number;
	readonly text: RichText;
	transformationRenderBlock?: boolean = undefined;
	private _updatingTitle = false;
	private optionalFindItemFn?: FindItemFn;
	private startPoint: ControlPoint = new BoardPoint();
	private endPoint: ControlPoint = new BoardPoint();
	private lineStyle: ConnectorLineStyle = 'straight';
	private startPointerStyle: ConnectorPointerStyle = 'None';
	private endPointerStyle: ConnectorPointerStyle = DEFAULT_END_POINTER;

	constructor(
		board: Board,
		id = "",
	) {
		super(board, id);
		this.lineColor = semanticColor('contrastNeutral');
		this.lineWidth = CONNECTOR_LINE_WIDTH;
		this.borderStyle = CONNECTOR_BORDER_STYLE;
		const savedSmartJump = new SessionStorage().getConnectorSmartJump();
		if (savedSmartJump !== undefined) {
			this.smartJump = savedSmartJump;
		}
		this.text = new RichText(this.board, this.id);
		this.text.container = this.getMbr();
		(this.text as any).transformation = this.transformation;
		(this.text as any).linkTo = this.linkTo;
		this.text.placeholderText = conf.i18n.t('connector.textPlaceholder', {
			ns: 'default',
		});
		this.text.isInShape = true;
		this.text.insideOf = 'Connector';
		this.text.updateShrinkWidth();
		// @ts-ignore
		this.text.initialTextStyles = {
			...conf.DEFAULT_TEXT_STYLES,
			fontSize:
				typeof window !== 'undefined' && localStorage.getItem('lastConnectorTextSize')
					? Number(localStorage.getItem('lastConnectorTextSize'))
					: conf.DEFAULT_TEXT_STYLES.fontSize,
			fontColor:
				typeof window !== 'undefined'
					? localStorage.getItem('lastConnectorTextColor') || conf.DEFAULT_TEXT_STYLES.fontColor
					: conf.DEFAULT_TEXT_STYLES.fontColor,
		};
		this.startPointer = getStartPointer(
			this.startPoint,
			this.startPointerStyle,
			this.lineStyle,
			this.lines,
			this.lineWidth * 0.1 + 0.3
		);
		this.endPointer = getEndPointer(
			this.endPoint,
			this.endPointerStyle,
			this.lineStyle,
			this.lines,
			this.lineWidth * 0.1 + 0.3
		);
		this.middlePoint = null;
		this.updateVisuals({ method: 'constructor', class: this.itemType } as any, UpdateHint.FullRebuild);
		this.initText();
	}

	private initText(): void {
		this.text.subject.subscribe(() => {
			this.updateTitle();
			this.subject.publish(this);
		});

		this.text.apply({
			class: 'RichText',
			method: 'setMaxWidth',
			item: [this.id],
			maxWidth: 300,
		});
		this.text.addMbr(this.getMbr());
		this.text.setSelectionHorisontalAlignment('left');
		this.text.editor.setSelectionHorisontalAlignment('left');
		this.text.editor.applyRichTextOp({
			class: 'RichText',
			method: 'setMaxWidth',
			item: [this.id],
			maxWidth: 300,
		});
		this.text.setClipPath();
		this.updateTitle();
	}

	observerStartPointItem = (): void => {
		const point = this.startPoint;
		if (point.pointType !== 'Board') {
			const reparentingGroupId = Group.reparentingGroupId;
			if (
				reparentingGroupId !== null &&
				(
					this.parent === reparentingGroupId ||
					(point.item instanceof BaseItem && point.item.parent === reparentingGroupId)
				)
			) {
				return;
			}
			const movingGroupId = Group.movingGroupId;
			if (
				movingGroupId !== null &&
				this.parent === movingGroupId &&
				point.item instanceof BaseItem &&
				point.item.parent === movingGroupId
			) {
				return;
			}
			if (this.handleItemGeometryChange(point, true)) return;
			point.recalculatePoint();
			// Skip smartJump when triggered by a group movement — position is already
			// correct via recalculatePoint and we must not emit spurious setStartPoint ops.
			const j1 = movingGroupId !== null ? false : this.smartJumpStartEdge();
			const j2 = movingGroupId !== null ? false : this.smartJumpEndEdge();
			if (!j1 && !j2) {
				this.updatePaths();
				this.subject.publish(this);
			}
		}
	};

	observerEndPointItem = (): void => {
		const point = this.endPoint;
		if (point.pointType !== 'Board') {
			const reparentingGroupId = Group.reparentingGroupId;
			if (
				reparentingGroupId !== null &&
				(
					this.parent === reparentingGroupId ||
					(point.item instanceof BaseItem && point.item.parent === reparentingGroupId)
				)
			) {
				return;
			}
			const movingGroupId = Group.movingGroupId;
			if (
				movingGroupId !== null &&
				this.parent === movingGroupId &&
				point.item instanceof BaseItem &&
				point.item.parent === movingGroupId
			) {
				return;
			}
			if (this.handleItemGeometryChange(point, false)) return;
			point.recalculatePoint();
			const j1 = movingGroupId !== null ? false : this.smartJumpEndEdge();
			const j2 = movingGroupId !== null ? false : this.smartJumpStartEdge();
			if (!j1 && !j2) {
				this.updatePaths();
				this.subject.publish(this);
			}
		}
	};

	private handleItemGeometryChange(point: ControlPoint, isStart: boolean): boolean {
		if (point.pointType === 'Fixed' || point.pointType === 'Floating') {
			const item = point.item;
			point.recalculatePoint();
			const nearestPoint = (item as Geometry).getNearestEdgePointTo(point.copy());
			const newRelative = toRelativePoint(nearestPoint, item);
			if (!newRelative.equal(point.relativePoint)) {
				const op = isStart
					? connectorOps.setStartPoint([this], new FixedPoint(item, newRelative))
					: connectorOps.setEndPoint([this], new FixedPoint(item, newRelative));
				this.apply(op);
				return true;
			}
		}
		return false;
	}


	/**
	 * If the start point is attached to one of the 4 edge-center anchors, re-evaluate
	 * which edge best faces the current end position and jump there to avoid sharp bends.
	 * Emits a setStartPoint operation so the jump is persisted and synced.
	 * Returns true if a jump was performed (caller should skip its own updatePaths/publish).
	 */
	private smartJumpStartEdge(): boolean {
		if (!this.smartJump) return false;
		const start = this.startPoint;
		if (start.pointType !== 'Fixed' && start.pointType !== 'Floating') return false;

		const item = start.item;
		const localAnchors = item.getSnapAnchorPoints?.();
		if (!localAnchors || localAnchors.length === 0) return false;

		// Convert anchor points to world space for nested items (items inside groups store
		// local transforms, so getSnapAnchorPoints() returns group-local coords).
		const anchors = (item instanceof BaseItem && item.parent !== 'Board')
			? localAnchors.map(a => {
				const p = a.copy();
				(item as BaseItem).getParentWorldMatrix().apply(p);
				return p;
			})
			: localAnchors;

		// Only jump if currently on one of the 4 edge-center anchors (world-space check).
		const EPS = 2;
		const isOnAnchor = anchors.some(a =>
			Math.abs(a.x - start.x) < EPS && Math.abs(a.y - start.y) < EPS
		);
		if (!isOnAnchor) return false;

		// Direction from the start item center toward the end point (world-space).
		const center = (item instanceof BaseItem && item.parent !== 'Board')
			? (item as BaseItem).getWorldMbr().getCenter()
			: item.getMbr().getCenter();
		const dx = this.endPoint.x - center.x;
		const dy = this.endPoint.y - center.y;
		if (dx === 0 && dy === 0) return false;

		// Pick the anchor whose outward direction best aligns with the end direction.
		let best = anchors[0];
		let bestDot = -Infinity;
		for (const anchor of anchors) {
			const ax = anchor.x - center.x;
			const ay = anchor.y - center.y;
			const len = Math.sqrt(ax * ax + ay * ay);
			if (len === 0) continue;
			const dot = (ax * dx + ay * dy) / len;
			if (dot > bestDot) {
				bestDot = dot;
				best = anchor;
			}
		}

		// Already on the best anchor — nothing to do.
		if (Math.abs(best.x - start.x) < EPS && Math.abs(best.y - start.y) < EPS) return false;

		// Emit setStartPoint so the jump is persisted and synced to collaborators.
		// applyStartPoint (called internally) handles updatePaths + subject.publish.
		this.apply(connectorOps.setStartPoint([this], new FixedPoint(item, toRelativePoint(best, item))));
		return true;
	}

	/** Mirror of smartJumpStartEdge for the end point. */
	private smartJumpEndEdge(): boolean {
		if (!this.smartJump) return false;
		const end = this.endPoint;
		if (end.pointType !== 'Fixed' && end.pointType !== 'Floating') return false;

		const item = end.item;
		const localAnchors = item.getSnapAnchorPoints?.();
		if (!localAnchors || localAnchors.length === 0) return false;

		// Convert anchor points to world space for nested items.
		const anchors = (item instanceof BaseItem && item.parent !== 'Board')
			? localAnchors.map(a => {
				const p = a.copy();
				(item as BaseItem).getParentWorldMatrix().apply(p);
				return p;
			})
			: localAnchors;

		const EPS = 2;
		const isOnAnchor = anchors.some(a =>
			Math.abs(a.x - end.x) < EPS && Math.abs(a.y - end.y) < EPS
		);
		if (!isOnAnchor) return false;

		// Direction from the end item center toward the start point (world-space).
		const center = (item instanceof BaseItem && item.parent !== 'Board')
			? (item as BaseItem).getWorldMbr().getCenter()
			: item.getMbr().getCenter();
		const dx = this.startPoint.x - center.x;
		const dy = this.startPoint.y - center.y;
		if (dx === 0 && dy === 0) return false;

		let best = anchors[0];
		let bestDot = -Infinity;
		for (const anchor of anchors) {
			const ax = anchor.x - center.x;
			const ay = anchor.y - center.y;
			const len = Math.sqrt(ax * ax + ay * ay);
			if (len === 0) continue;
			const dot = (ax * dx + ay * dy) / len;
			if (dot > bestDot) {
				bestDot = dot;
				best = anchor;
			}
		}

		if (Math.abs(best.x - end.x) < EPS && Math.abs(best.y - end.y) < EPS) return false;

		this.apply(connectorOps.setEndPoint([this], new FixedPoint(item, toRelativePoint(best, item))));
		return true;
	}


	private applySmartJump(value: boolean): void {
		this.smartJump = value;
	}

	getSmartJump(): boolean {
		return this.smartJump;
	}

	setSmartJump(value: boolean): void {
		this.emit(
			connectorOps.setSmartJump([this], value)
		);
	}

	clearObservedItems() {
		const startPoint = this.getStartPoint();
		const endPoint = this.getEndPoint();

		if (startPoint.pointType !== 'Board') {
			this.unsubscribeFromItem(startPoint, this.observerStartPointItem);
		}

		if (endPoint.pointType !== 'Board') {
			this.unsubscribeFromItem(endPoint, this.observerEndPointItem);
		}
	}

	private unsubscribeFromItem(point: ControlPoint, observer: (item: Item) => void): void {
		if (point.pointType !== 'Board') {
			point.item.subject.unsubscribe(observer);
		}
	}

	private subscribeToItem(point: ControlPoint, observer: (item: Item) => void): void {
		if (this.id) {
			if (point.pointType !== 'Board') {
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

	override apply(opIn: Operation | BaseItemOperation | BaseOperation): void {
		const op = opIn as Operation;
		if (op.class === 'RichText') {
			this.text.apply(op);
		} else if (op.class === 'Connector') {
			switch (op.method) {
				case 'setStartPoint':
					this.applyStartPoint(op.startPointData, false);
					break;
				case 'setEndPoint':
					this.applyEndPoint(op.endPointData, false);
					break;
				case 'setMiddlePoint':
					this.applyMiddlePoint(op.middlePointData, false);
					break;
				case 'switchPointers':
					this.applySwitchPointers();
					break;
				case 'setSmartJump':
					this.applySmartJump(op.smartJump);
					break;
			}
		} else {
			super.apply(op);
			return;
		}

		const hint = this.calculateUpdateHint(op);
		this.updateVisuals(op, hint);
	}

	protected override updateVisuals(op: Operation, hint: UpdateHint): void {
		if (hint === UpdateHint.VisualOnly) {
			this.lines.setBorderWidth(this.lineWidth);
			this.lines.setBorderStyle(this.borderStyle);
			this.subject.publish(this);
			return;
		}

		if (hint === UpdateHint.TranslateOnly) {
			this.translatePoints();
			this.updatePaths();
		} else if (hint === UpdateHint.TransformGeometry) {
			const transformOp = op as TransformationOperation;
			if (transformOp.method === 'applyMatrix') {
				const itemOp = transformOp.items.find(i => i.id === this.getId());
				if (itemOp && (itemOp.matrix.scaleX !== 1 || itemOp.matrix.scaleY !== 1)) {
					this.scalePoints();
				}
			}
			this.translatePoints();
			this.updatePaths();
		} else {
			// LayoutAffecting or FullRebuild
			this.updatePaths();
		}

		this.subject.publish(this);
	}

	protected override onPropertyUpdated(property: string, value: unknown, prevValue: unknown): void {
		super.onPropertyUpdated(property, value, prevValue);
	}



	complete(id: string): void {
		this.id = id;
		this.updatePaths();
	}


	protected applyStartPoint(pointData: ControlPointData, updatePath = true): void {
		const optionalFn = this.getOptionalFindFn();
		const findItem = optionalFn ? optionalFn : (itemId: string) => this.board.items.findById(itemId);
		if (
			pointData.pointType !== 'Board' &&
			this.startPoint.pointType !== 'Board' &&
			pointData.itemId === this.startPoint.item.getId()
		) {
			this.startPoint = getControlPoint(pointData, findItem);
		} else {
			this.unsubscribeFromItem(this.startPoint, this.observerStartPointItem);
			this.startPoint = getControlPoint(pointData, findItem);
			this.subscribeToItem(this.startPoint, this.observerStartPointItem);
		}
		if (updatePath) {
			this.updatePaths();
		}
	}


	protected applyEndPoint(pointData: ControlPointData, updatePath = true): void {
		this.unsubscribeFromItem(this.endPoint, this.observerEndPointItem);
		const optionalFn = this.getOptionalFindFn();
		this.endPoint = getControlPoint(
			pointData,
			optionalFn ? optionalFn : itemId => this.board.items.findById(itemId)
		);
		this.subscribeToItem(this.endPoint, this.observerEndPointItem);
		if (updatePath) {
			this.updatePaths();
		}
	}

	protected applyMiddlePoint(pointData: ControlPointData | null, updatePath = true): void {
		if (!pointData) {
			return;
		}
		const optionalFn = this.getOptionalFindFn();
		this.middlePoint = getControlPoint(
			pointData,
			optionalFn ? optionalFn : itemId => this.board.items.findById(itemId)
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
		if (this.lineStyle === 'orthogonal') {
			const segments = this.lines.getSegments();
			const middle = segments[Math.floor(segments.length / 2)];
			const start = middle.getStartPoint();
			const end = "end" in middle ? middle.end : middle.getEndPoint();
			return {
				x: (start.x + end.x) / 2,
				y: (start.y + end.y) / 2,
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

	getLineColor(): ColorValue {
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

	isAlignmentSource(): boolean {
		return false;
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
		return this.startPoint.pointType !== 'Board' && this.endPoint.pointType !== 'Board';
	}

	getConnectedItems(): { startItem?: Item; endItem?: Item } {
		const connectedItems: { startItem?: Item; endItem?: Item } = {
			startItem: undefined,
			endItem: undefined,
		};
		if (this.startPoint.pointType !== 'Board') {
			connectedItems.startItem = this.startPoint.item;
		}
		if (this.endPoint.pointType !== 'Board') {
			connectedItems.endItem = this.endPoint.item;
		}
		return connectedItems;
	}

	isConnectedOnePoint(): boolean {
		return this.startPoint.pointType !== 'Board' || this.endPoint.pointType !== 'Board';
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		if (CONNECTOR_LINE_CAP === 'round') {
			context.ctx.lineCap = 'round';
			context.ctx.lineJoin = 'round';
		}
		const mbr = this.getMbr();
		mbr.borderColor = 'red';
		mbr.strokeWidth = 3;
		mbr.borderStyle = 'solid';
		// mbr.render(context)
		this.clipText(context);
		const resolvedLineColor = resolveColor(this.lineColor, conf.theme, 'foreground');
		this.lines.setBorderColor(resolvedLineColor);
		this.startPointer.path.setBorderColor(resolvedLineColor);
		this.startPointer.path.setBackgroundColor(resolvedLineColor);
		this.endPointer.path.setBorderColor(resolvedLineColor);
		this.endPointer.path.setBackgroundColor(resolvedLineColor);
		if (
			!this.text.isRenderEnabled &&
			this.board.selection.getContext() !== 'EditTextUnderPointer'
		) {
			this.lines.render(context);
		}
		if (this.startPointerStyle !== 'None') {
			this.startPointer.path.render(context);
		}
		if (this.endPointerStyle !== 'None') {
			this.endPointer.path.render(context);
		}
		if (this.getLinkTo()) {
			const { top, right } = this.endPointer.path.getMbr();
			this.linkTo.render(context, top, right, this.board.camera.getScale());
		}
	}

	clipText(context: DrawingContext): void {
		const selectionContext = this.board.selection.getContext();
		if (this.text.isEmpty() && !this.board.selection.items.list().includes(this)) {
			this.text.disableRender();
			this.lines.render(context);
			return;
		}

		if (
			this.text.isEmpty() &&
			this.board.selection.items.list().includes(this) &&
			(selectionContext === 'SelectUnderPointer' ||
				selectionContext === 'EditUnderPointer' ||
				selectionContext === 'SelectByRect')
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
		ctx.rect(cameraMbr.left, cameraMbr.top, cameraMbr.getWidth(), cameraMbr.getHeight());

		// Remove the text rectangle area from the path to create the exclusion/clipping area
		// This assumes a clockwise definition of the canvas rectangle and an anti-clockwise definition of the inner rectangle
		ctx.moveTo(textMbr.left - TEXT_BORDER_PADDING * 2, textMbr.top - TEXT_BORDER_PADDING * 2);
		ctx.lineTo(
			textMbr.left - TEXT_BORDER_PADDING * 2,
			textMbr.bottom + TEXT_BORDER_PADDING * 2
		);
		ctx.lineTo(
			textMbr.right + TEXT_BORDER_PADDING * 2,
			textMbr.bottom + TEXT_BORDER_PADDING * 2
		);
		ctx.lineTo(textMbr.right + TEXT_BORDER_PADDING * 2, textMbr.top - TEXT_BORDER_PADDING * 2);
		ctx.closePath();

		// Use the clip method to clip to the outside of the text rect
		ctx.clip('evenodd'); // 'evenodd' is a fill rule that allows us to subtract the text rect from the clip area

		// Render lines that won't appear inside the text rect
		this.lines.render(context);

		// Restore the context to remove the clipping region
		ctx.restore();

		// Render text in the center of the connector
		const { x, y } = this.calculateMiddlePoint();
		const textWidth = this.text.getWidth();
		const textHeight = this.text.getHeight();
		this.text.apply(transformOps.translateTo(this.text, x - textWidth / 2, y - textHeight / 2));

		this.text.render(context);

		if (
			DRAW_TEXT_BORDER &&
			(selectionContext === 'EditUnderPointer' ||
				selectionContext === 'EditTextUnderPointer') &&
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
				textMbr.getHeight() + TEXT_BORDER_PADDING * 2
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

	serialize(): SerializedItemData<ConnectorData> {
		const text = this.text.serialize();
		if (text) {
			(text as any).transformation = undefined;
		}
		const mbr = this.getMbr();
		const transformation = new Transformation();
		transformation.apply(transformOps.setLocal(this.id, { translateX: mbr.left, translateY: mbr.top }));
		return {
			id: this.id,
			itemType: 'Connector',
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
			smartJump: this.smartJump,
			linkTo: this.linkTo.serialize(),
		};
	}

	deserialize(data: SerializedItemData<ConnectorData> | ConnectorData): this {

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
			this.linkTo.deserialize(linkTo);
		}
		this.startPointerStyle = data.startPointerStyle ?? this.startPointerStyle;
		this.endPointerStyle = data.endPointerStyle ?? this.endPointerStyle;
		this.lineStyle = data.lineStyle ?? this.lineStyle;
		if (data.lineColor != null) {
			this.lineColor = coerceColorValue(data.lineColor);
		}
		this.lineWidth = data.lineWidth ?? this.lineWidth;
		this.borderStyle = data.borderStyle ?? this.borderStyle;
		if (data.smartJump != null) {
			this.smartJump = data.smartJump;
		}
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		this.updateVisuals({ method: "deserialize", class: this.itemType } as any, UpdateHint.FullRebuild);
		return this;
	}

	protected override getPropertyUpdateHint(property: string): UpdateHint {
		const layoutAffectingConnectorProps = ["lineStyle", "smartJump", "startPoint", "endPoint", "middlePoint"];
		const visualOnlyConnectorProps = ["lineColor", "lineWidth", "borderStyle", "startPointerStyle", "endPointerStyle"];

		if (layoutAffectingConnectorProps.includes(property)) {
			return UpdateHint.LayoutAffecting;
		}
		if (visualOnlyConnectorProps.includes(property)) {
			return UpdateHint.VisualOnly;
		}
		return super.getPropertyUpdateHint(property);
	}

	getConnectorById(items: Item[], connectorId: string): Connector | undefined {
		return items.find(
			item => item instanceof Connector && item.getId() === connectorId
		) as Connector;
	}

	updateTitle(): void {
		if (this._updatingTitle) {
			return;
		}
		const selection = this.board.selection;
		const isConnectorSelected = selection.items.findById(this.id);
		if (isConnectorSelected && this.board.selection.getContext() === 'EditTextUnderPointer') {
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

		this._updatingTitle = true;
		try {
			this.text.apply(transformOps.translateTo(this.text, x - width / 2, y - height / 2));
			this.text.updateElement();
		} finally {
			this._updatingTitle = false;
		}
		// this.animationFrameId = 0;
	}

	private scalePoints(): void {
		const origin = new Point(this.getMbr().left, this.getMbr().top);
		const previous = this.transformation.previous.copy();
		previous.translateX = 0;
		previous.translateY = 0;
		previous.invert();
		const currUnscaled = this.transformation.toMatrix();
		currUnscaled.translateX = 0;
		currUnscaled.translateY = 0;
		const delta = previous.multiplyByMatrix(currUnscaled);
		this.scalePoint(this.startPoint, origin, delta, 'start');
		this.scalePoint(this.endPoint, origin, delta, 'end');
	}

	private scalePoint(
		point: ControlPoint,
		origin: Point,
		scaleMatrix: Matrix,
		edge: ConnectorEdge
	): void {
		if (point.pointType !== 'Board') {
			return;
		}
		const deltaX = point.x - origin.x;
		const deltaY = point.y - origin.y;
		// need to replace with getProportionalResize or fix connector transformation in getProportionalResize
		const scaledX = origin.x + deltaX * scaleMatrix.scaleX;
		const scaledY = origin.y + deltaY * scaleMatrix.scaleY;

		const newPoint = new BoardPoint(scaledX, scaledY);
		if (edge === 'start') {
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
		const currUnscaled = this.transformation.toMatrix();
		currUnscaled.scaleX = 1;
		currUnscaled.scaleY = 1;
		const delta = previous.multiplyByMatrix(currUnscaled);
		this.translatePoint(this.startPoint, delta, 'start');
		this.translatePoint(this.endPoint, delta, 'end');
	}

	private translatePoint(point: ControlPoint, delta: Matrix, edge: ConnectorEdge): void {
		if (point.pointType !== 'Board') {
			return;
		}
		const newPoint = new BoardPoint(point.x, point.y);
		newPoint.transform(delta);
		if (edge === 'start') {
			this.startPoint = newPoint;
		} else if (edge === 'middle') {
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
			this.middlePoint
		).addConnectedItemType(this.itemType);

		this.startPointer = getStartPointer(
			startPoint,
			this.startPointerStyle,
			this.lineStyle,
			this.lines,
			this.lineWidth * 0.1 + 0.2
		);
		this.startPointer.path.setBorderWidth(this.lineWidth);
		this.endPointer = getEndPointer(
			endPoint,
			this.endPointerStyle,
			this.lineStyle,
			this.lines,
			this.lineWidth * 0.1 + 0.2
		);
		this.endPointer.path.setBorderWidth(this.lineWidth);

		this.offsetLines();

		this.lines.setBorderWidth(this.lineWidth);
		this.lines.setBorderStyle(this.borderStyle);

		this.updateTitle();
	}

	private offsetLines(): void {
		const segments = this.lines.getSegments();
		const line = segments[0];
		const start = line.getStartPoint();
		const end = "end" in line ? line.end : line.getEndPoint();
		if (this.lineStyle === 'orthogonal') {
			if (this.startPoint.pointType !== 'Board') {
				this.lines = new Path([
					new Line(this.startPointer.start, start),
					...segments,
				]).addConnectedItemType(this.itemType);
			} else {
				this.lines = new Path([
					new Line(this.startPointer.start, end),
					...segments.slice(1),
				]).addConnectedItemType(this.itemType);
			}
			const updated = this.lines.getSegments();
			const lastLine = updated[updated.length - 1];
			const lastLineStart = lastLine.getStartPoint();
			const lastLineEnd = "end" in lastLine ? lastLine.end : lastLine.getEndPoint();
			if (this.endPoint.pointType !== 'Board') {
				this.lines = new Path([
					...updated,
					new Line(lastLineEnd, this.endPointer.start),
				]).addConnectedItemType(this.itemType);
			} else {
				this.lines = new Path([
					...updated.slice(0, updated.length - 1),
					new Line(lastLineStart, this.endPointer.start),
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
					line.endControl
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

	override getRichText(): RichText {
		return this.text;
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}
}

registerItem({
	item: Connector,
	defaultData: new ConnectorData(),
	schema: ConnectorDataSchema,
  overlay: connectorOverlay,
});
