import { Mbr } from "Geometry/Mbr/Mbr";
import { Line } from "Geometry/Line/Line";
import { Item } from "Items/Item";
import { Geometry } from "Geometry/Geometry";
import type { RichText } from "Items/RichText/RichText";
import { LinkTo } from "Items/LinkTo/LinkTo";
import { Transformation } from "Geometry/Transformation/Transformation";
import { Board } from "Board";
import { DrawingContext } from "Geometry/DrawingContext";
import { BaseOperation, Operation, SetPropertyOperation } from "../../Events/EventsOperations";
import { Command } from "../../Events/Command";
import { TransformationData } from "Geometry/Transformation/TransformationData";
import { itemSchemas } from "Items/itemSchemas";
import { BaseCommand } from "Events/BaseCommand";
import { Subject } from "../../Subject";
import { Path, Paths } from "Geometry/Path/index";
import { BaseItemOperation } from "./BaseItemOperation";
import { SimpleSpatialIndex } from "../../SpatialIndex/SimpleSpatialIndex";
import { Point } from "Geometry/Point";
import { Matrix } from "Geometry/Transformation/Matrix";
import { TransformationOperation, MoveItem, SetPlacementItem, MatrixData } from "Geometry/Transformation/TransformationOperations";
import type { LinkToOperation } from "../LinkTo/LinkToOperation";
import { TransformParams, TransformResult } from "./TransformContext";
import { GeometricNormal } from "Geometry/GeometricNormal";

import { getResizeType, ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { transformOps } from "Geometry/Transformation/transformOps";
import type { ItemType } from "Items/Item";
import { toLocalTransformOp } from "./toLocalTransformOp";
import type { ItemOverlayDefinition } from "Overlay";
import { getItemOverlay } from "Overlay";
import { UpdateHint } from "./UpdateHint";

export interface BaseItemData {
	itemType: string;
	transformation?: TransformationData;
	linkTo?: string;
	childIds?: string[];
	parent?: string;
	[key: string]: unknown;
}

export type SerializedItemData<T extends BaseItemData = BaseItemData> = T & {
	id: string;
	transformation: TransformationData;
};

export class BaseItem<T extends BaseItem<any> = any> implements Geometry {
	static createCommand?: (board: Board, operation: Operation) => Command;
	protected mbr = new Mbr();
	id: string;
	public readonly linkTo: LinkTo;
	public readonly transformation: Transformation;
	parent: string = "Board";
	canBeNested = true;
	transformationRenderBlock?: boolean = undefined;
	index: SimpleSpatialIndex | null = null;
	board: Board;
	subject = new Subject<T>();
	onRemoveCallbacks: (() => void)[] = [];
	shouldUseCustomRender = false;
	shouldRenderOutsideViewRect = true;
	shouldUseRelativeAlignment = true;
	resizeEnabled = true;
	onlyProportionalResize = false;
	itemType: ItemType = '' as any;
	childIds: string[] = [];
	isHoverHighlighted = false;

	static readonly HOVER_HIGHLIGHT_COLOR = "rgba(71, 120, 245, 0.7)";

	/** Cached max half-extent for force-graph physics: max(w, h) * 0.5.
	 *  -1 means dirty. Physics never scales items, so this is valid for the
	 *  entire simulation once computed. Invalidated on resize/scale only. */
	private _physicsHalfExtent = -1;

	get physicsHalfExtent(): number {
		if (this._physicsHalfExtent < 0) {
			const mbr = this.getMbr();
			const w = Math.max(mbr.getWidth(), 1);
			const h = Math.max(mbr.getHeight(), 1);
			this._physicsHalfExtent = Math.max(w, h) * 0.5;
		}
		return this._physicsHalfExtent;
	}

	constructor(board: Board, id = "") {
		this.board = board;
		this.id = id || Math.random().toString(36).substring(2, 11);
		this.transformation = new Transformation(this.id, board.events);
		this.linkTo = new LinkTo(this.id, board.events);
	}

	updateChildrenIds(): void {
		this.childIds = this.index?.items.listAll().map(item => item.getId()) || [];
	}

	/**
	 * Called when this item's parent changes. Subclasses override this to
	 * propagate the new parent to child objects (e.g. text.parent in Sticker/Shape).
	 */
	protected onParentChanged(_newParent: string): void { }

	getId(): string {
		return this.id;
	}

	getOverlay(): ItemOverlayDefinition | undefined {
		return getItemOverlay(this);
	}

	/**
	 * Updates the local axis-aligned bounding box.
	 */
	updateMbr(): void {
		if (this.parent !== "Board" && this.board?.items) {
			const parent = this.board.items.getById(this.parent);
			if (parent && "updateMbr" in parent) {
				(parent as any).updateMbr();
			}
		}
		this.subject.publish(this as any);
	}

	/**
	 * Returns the parent's world matrix. For Frames, only the translation component
	 * is returned to ensure children are not affected by frame scaling.
	 */
	getParentWorldMatrix(): Matrix {
		if (this.parent === "Board") {
			return new Matrix();
		}
		const container = this.board.items.getById(this.parent) as BaseItem | undefined;
		if (!container) {
			return new Matrix();
		}
		const matrix = container.getWorldMatrix();
		if (!container?.getIsScalingContainer()) {
			return new Matrix(matrix.translateX, matrix.translateY, 1, 1, 0, 0);
		}
		return matrix;
	}

	/**
	 * Returns the world matrix for this item by composing its local matrix with its parent's
	 * world matrix recursively. Calculates on-the-fly to ensure it is always up-to-date.
	 */
	getWorldMatrix(): Matrix {
		const matrix = this.transformation.toMatrix();
		if (this.parent !== "Board" && this.board?.items) {
			const parent = this.board.items.getById(this.parent);
			if (parent && "getWorldMatrix" in parent) {
				return matrix.composeWith((parent as any).getWorldMatrix());
			}
		}
		return matrix;
	}

	/**
	 * Returns the matrix used for nesting children. For Frames, this is only
	 * the translation part. For other items it is the full world matrix.
	 */
	getNestingMatrix(): Matrix {
		const matrix = this.getWorldMatrix();
		if (!this.getIsScalingContainer()) {
			return new Matrix(matrix.translateX, matrix.translateY, 1, 1, 0, 0);
		}
		return matrix;
	}

	setId(id: string): this {
		this.id = id;
		this.transformation.setId(id);
		this.linkTo.setId(id);
		const rt = this.getRichText();
		if (rt && (rt as any) !== this) {
			rt.setId(id);
		}
		return this;
	}

	getChildrenIds(): string[] | null {
		if (!this.index) {
			return null;
		}
		return this.index.items.listAll().map(item => item.getId());
	}

	/** @deprecated Use transformOps.setPlacement instead */
	addChildItems(children: BaseItem[]): void {
		if (!this.index || children.length === 0) {
			return;
		}
		const timeStamp = Date.now();
		const items = children.map(child => ({
			id: child.getId(),
			parentId: this.getId(),
			zOrderIndex: 0,
			worldMatrix: child.getWorldMatrix(),
			prevParentId: child.parent,
			prevWorldMatrix: child.getWorldMatrix(),
		}));
		this.emitForManyItems(transformOps.setPlacement(items, timeStamp));
	}

	/** @deprecated Use transformOps.setPlacement instead */
	removeChildItems(children: BaseItem[] | BaseItem): void {
		if (!this.index) {
			return;
		}
		const childrenArr = Array.isArray(children) ? children : [children];
		if (childrenArr.length === 0) {
			return;
		}
		const timeStamp = Date.now();
		const items = childrenArr.map(child => ({
			id: child.getId(),
			parentId: "Board",
			zOrderIndex: 0,
			worldMatrix: child.getWorldMatrix(),
			prevParentId: this.getId(),
			prevWorldMatrix: child.getWorldMatrix(),
		}));
		this.emitForManyItems(transformOps.setPlacement(items, timeStamp));
	}

	rotate(degree: number): void {
		this.apply({
			class: "Transformation",
			method: "rotateBy",
			item: [this.id],
			degree,
		});
	}

	applySetPlacement(op: SetPlacementItem): void {
		if (this.parent !== op.parentId) {
			const currentParentId = this.parent;
			const currentParent = currentParentId !== "Board"
					? (this.board.items.getById(currentParentId) as BaseItem | undefined)
					: undefined;
			const sourceIndex = currentParent?.index || this.board.items.index;
			sourceIndex.remove(this as any, true);

			this.parent = op.parentId;
			this.onParentChanged(op.parentId);

			const newParent = op.parentId !== "Board"
					? (this.board.items.getById(op.parentId) as BaseItem | undefined)
					: undefined;
			const targetIndex = newParent?.index || this.board.items.index;
			targetIndex.insert(this as any);
		}

		const parentMatrix = this.getParentWorldMatrix();
		const localMatrix = Matrix.fromData(op.worldMatrix).toLocalOf(parentMatrix);

		this.transformation.apply({
			class: "Transformation",
			method: "setLocalMatrix",
			item: [this.id],
			matrix: localMatrix,
		} as any);

		if (op.zOrderIndex !== undefined) {
			const currentParentId = this.parent;
			const currentParent = currentParentId !== "Board"
					? (this.board.items.getById(currentParentId) as BaseItem | undefined)
					: undefined;
			const index = currentParent?.index || this.board.items.index;
			index.moveToZIndex(this as any, op.zOrderIndex);
		}
	}

	applyMove(op: MoveItem): void {
		const parentMatrix = this.getParentWorldMatrix();
		const localMatrix = Matrix.fromData(op.worldMatrix).toLocalOf(parentMatrix);

		this.transformation.apply({
			class: "Transformation",
			method: "setLocalMatrix",
			item: [this.id],
			matrix: localMatrix,
		} as any);
	}

	emitNesting(children: BaseItem[]): void {
		const itemsToAdd: BaseItem[] = [];
		const itemsToRemove: BaseItem[] = [];

		children.forEach((child) => {
			if (this.handleNesting(child)) {
				itemsToAdd.push(child);
			} else {
				itemsToRemove.push(child);
			}
		})
		this.addChildItems(itemsToAdd);
		this.removeChildItems(itemsToRemove);
	}

	handleNesting(
		item: BaseItem | Mbr,
		options?: {
			onlyForOut?: boolean;
			cancelIfChild?: boolean;
		}
	): boolean {
		const isItem = "itemType" in item;
		// Use world-space MBR so nested items (inside a group) are compared in the
		// same coordinate space as the container's own world MBR.
		const itemMbr = isItem ? (item as BaseItem).getWorldMbr() : item;
		if (item instanceof BaseItem && !item.canBeNested) {
			return false;
		}
		if (options?.cancelIfChild && isItem && item.parent !== "Board") {
			return false;
		}

		const mbr = this.getMbr().copy();
		if (itemMbr.isEnclosedOrCrossedBy(mbr)) {
			if (mbr.isInside(itemMbr.getCenter())) {
				if (!options || !options.onlyForOut) {
					return true;
				}
			}
		}
		return false;
	}

	getMbr(): Mbr {
		return this.mbr.copy();
	}

	setMbr(rect: Mbr): void {
		this.mbr.left = rect.left;
		this.mbr.top = rect.top;
		this.mbr.right = rect.right;
		this.mbr.bottom = rect.bottom;
		this.updateMbr();
	}

	addMbr(rect: Mbr): void {
		this.mbr.addMbr(rect);
		this.updateMbr();
	}

	getWidth(): number {
		return this.mbr.getWidth();
	}

	getHeight(): number {
		return this.mbr.getHeight();
	}

	getCenter(): Point {
		return this.mbr.getCenter();
	}

	/**
	 * Returns the world-space axis-aligned bounding box.
	 * Since this.mbr always represents bounds in parent-space (with the item's local
	 * transformation already baked in), we only need to transform it through its
	 * parent's world matrix. Calculates on-the-fly to ensure it is always fresh.
	 */
	getWorldMbr(): Mbr {
		const matrix = this.getParentWorldMatrix();
		const local = this.getMbr();
		const corners = [
			new Point(local.left, local.top),
			new Point(local.right, local.top),
			new Point(local.right, local.bottom),
			new Point(local.left, local.bottom),
		];
		for (const c of corners) matrix.apply(c);
		return new Mbr(
			Math.min(corners[0].x, corners[1].x, corners[2].x, corners[3].x),
			Math.min(corners[0].y, corners[1].y, corners[2].y, corners[3].y),
			Math.max(corners[0].x, corners[1].x, corners[2].x, corners[3].x),
			Math.max(corners[0].y, corners[1].y, corners[2].y, corners[3].y),
		);
	}

	getIntersectionPoints(segment: Line): Point[] {
		const parentMatrix = this.getParentWorldMatrix();
		const parentSegment = new Line(
			segment.start.getTransformed(parentMatrix.getInverse()),
			segment.end.getTransformed(parentMatrix.getInverse())
		);
		return this.mbr.getIntersectionPoints(parentSegment).map(p => p.getTransformed(parentMatrix));
	}

	getNearestEdgePointTo(point: Point): Point {
		const parentMatrix = this.getParentWorldMatrix();
		const parentPoint = point.getTransformed(parentMatrix.getInverse());
		const nearest = this.mbr.getNearestEdgePointTo(parentPoint);
		return nearest.getTransformed(parentMatrix);
	}

	isInView(rect: Mbr): boolean {
		return this.getMbrWithChildren().isInView(rect);
	}

	getNormal(point: Point): GeometricNormal {
		const parentMatrix = this.getParentWorldMatrix();
		const parentPoint = point.getTransformed(parentMatrix.getInverse());
		const normal = this.mbr.getNormal(parentPoint);
		return new GeometricNormal(
			normal.point.getTransformed(parentMatrix),
			normal.projectionPoint.getTransformed(parentMatrix),
			normal.normalPoint.getTransformed(parentMatrix)
		);
	}

	private hasAncestor(itemId: string): boolean {
		let parentId = this.parent;
		while (parentId && parentId !== "Board") {
			if (parentId === itemId) {
				return true;
			}
			const parent = this.board.items.getById(parentId) as BaseItem | undefined;
			if (!parent || parent.parent === parentId) {
				break;
			}
			parentId = parent.parent;
		}
		return false;
	}

	/** @deprecated Use applySetPlacement instead */
	applyAddChildren(childIds: string[]): void {
		if (!this.index) {
			return;
		}
		const containerNestingMatrix = this.getNestingMatrix();
		childIds.forEach((childId) => {
			const foundItem = this.board.items.getById(childId) as BaseItem | undefined;
			if (
				this.parent !== childId &&
				this.getId() !== childId &&
				!this.hasAncestor(childId)
			) {
				if (!this.index?.getById(childId) && foundItem) {
					// Convert the child's current world transform to local (relative to this container).
					// Must use getWorldMatrix() (not transformation.toMatrix()) so that items coming
					// from another container (e.g. inside a Frame or Group) are correctly converted
					// from their WORLD position rather than their container-relative local position.
					const worldMatrix = foundItem.getWorldMatrix();
					const localMatrix = worldMatrix.toLocalOf(containerNestingMatrix);
					const currentParentId = foundItem.parent;
					const currentParent =
						currentParentId !== "Board"
							? (this.board.items.getById(currentParentId) as BaseItem | undefined)
							: undefined;
					const sourceIndex = currentParent?.index || this.board.items.index;
					sourceIndex.remove(foundItem, true);

					foundItem.parent = this.getId();
					foundItem.onParentChanged(this.getId());
					foundItem.apply({
						class: "Transformation",
						method: "setLocalMatrix",
						item: [foundItem.id],
						matrix: localMatrix,
					} as any);
					this.index?.insert(foundItem);
				}
			}
		});
		this.updateChildrenIds();
		this.updateMbr();
		this.subject.publish(this as unknown as T);
	}

	/** @deprecated Use applySetPlacement instead */
	applyRemoveChildren(childIds: string[]): void {
		if (!this.index) {
			return;
		}
		const containerNestingMatrix = this.getNestingMatrix();
		childIds.forEach((childId) => {
			const foundItem = this.index?.getById(childId) as BaseItem | undefined;
			if (
				this.parent !== childId &&
				this.getId() !== childId
			) {
				if (foundItem) {
					// Convert local transform back to world before returning the item to the board index.
					const worldMatrix = foundItem.transformation.toMatrix().composeWith(containerNestingMatrix);
					this.index?.remove(foundItem, true);
					foundItem.parent = "Board";
					foundItem.onParentChanged("Board");
					foundItem.apply({
						class: "Transformation",
						method: "setLocalMatrix",
						item: [foundItem.id],
						matrix: worldMatrix,
					} as any);
					this.board.items.index.insert(foundItem);
				}
			}
		});
		this.updateChildrenIds();
		this.updateMbr();
		this.subject.publish(this as unknown as T);
	}


	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}

	getRichText(): RichText | null {
		return null;
	}

	deserialize(data: SerializedItemData | BaseItemData): this {
		if (data.childIds) {
			this.applyAddChildren(data.childIds);
		}
		Object.entries(data).forEach(([key, value]) => {
			const target = (this as unknown as Record<string, Record<string, unknown> | undefined>)[key];
			if (target?.deserialize) {
				(target as any).deserialize(value);
			} else {
				(this as unknown as Record<string, unknown>)[key] = value;
			}
		});

		this.updateVisuals({ method: "deserialize", class: this.itemType } as any, UpdateHint.FullRebuild);

		return this;
	}

	serialize(): SerializedItemData<BaseItemData> {
		return {
			id: this.id,
			linkTo: this.linkTo.serialize(),
			transformation: this.transformation.serialize(),
			itemType: this.itemType,
			childIds: this.childIds,
			parent: this.parent,
			resizeEnabled: this.resizeEnabled,
		};
	}

	isClosed() {
		return true;
	}

	emit(operation: Operation | BaseOperation): void {
		if (this.board.events) {
			if (!BaseItem.createCommand) {
				throw new Error("BaseItem.createCommand is not initialized");
			}
			const command = BaseItem.createCommand(this.board, operation as Operation);
			command.apply();
			this.board.events.emit(operation as Operation, command);
		} else {
			this.apply(operation);
		}
	}

	emitForManyItems(operation: Operation | BaseOperation): void {
		if (this.board.events) {
			if (!BaseItem.createCommand) {
				throw new Error("BaseItem.createCommand is not initialized");
			}
			const command = BaseItem.createCommand(this.board, operation as Operation);
			command.apply();
			this.board.events.emit(operation as Operation, command);
		} else {
			this.board.apply(operation as Operation);
		}
	}

	disableResize(items: BaseItem[]): void {
		const itemsMap: Record<string, string[]> = {}
		items.forEach((item) => {
			if (!item.resizeEnabled) {
				return;
			}
			if (itemsMap[item.itemType]) {
				itemsMap[item.itemType].push(item.getId());
			} else {
				itemsMap[item.itemType] = [item.getId()];
			}
		})
		Object.entries(itemsMap).forEach(([itemType, itemIds]) => {
			this.emitForManyItems({
				class: itemType,
				method: "toggleResizeEnabled",
				item: itemIds,
				newData: { resizeEnabled: false },
				prevData: { resizeEnabled: true },
			});
		})
	}

	enableResize(items: BaseItem[]): void {
		const itemsMap: Record<string, string[]> = {}
		items.forEach((item) => {
			if (item.resizeEnabled) {
				return;
			}
			if (itemsMap[item.itemType]) {
				itemsMap[item.itemType].push(item.getId());
			} else {
				itemsMap[item.itemType] = [item.getId()];
			}
		})
		Object.entries(itemsMap).forEach(([itemType, itemIds]) => {
			this.emitForManyItems({
				class: itemType,
				method: "toggleResizeEnabled",
				item: itemIds,
				newData: { resizeEnabled: true },
				prevData: { resizeEnabled: false },
			});
		})
	}

	apply(opIn: Operation | BaseItemOperation | BaseOperation): void {
		const op = opIn as Operation;

		if (op.class === "Transformation") {
			if (op.method === "move") {
				const itemOp = (op as any).items.find((i: any) => i.id === this.id);
				if (itemOp) this.applyMove(itemOp);
				return;
			}
			if (op.method === "setPlacement") {
				const itemOp = (op as any).items.find((i: any) => i.id === this.id);
				if (itemOp) this.applySetPlacement(itemOp);
				return;
			}
		}

		if (op.method === "setProperty") {
			const setPropOp = op as SetPropertyOperation;
			if (setPropOp.class === this.itemType || setPropOp.class === "Item") {
				const prevValue = (this as any)[setPropOp.property];
				let safeValue = setPropOp.value;

				const schema = (itemSchemas[this.itemType] as any)?.shape?.[setPropOp.property];
				if (schema) {
					try {
						safeValue = schema.parse(setPropOp.value);
					} catch (e) {
						console.error(`Validation failed for property ${setPropOp.property} on ${this.itemType}:`, e);
						return;
					}
				}

				// @ts-ignore
				this[setPropOp.property] = safeValue;
				this.onPropertyUpdated(setPropOp.property, safeValue, prevValue);
			}
			return;
		}

		switch (op.class) {
			case "Transformation": {
				let transformOp = op as TransformationOperation;
				if (this.parent !== "Board") {
					const container = this.board.items.getById(this.parent) as BaseItem | undefined;
					if (container?.transformation) {
						transformOp = toLocalTransformOp(
							transformOp,
							container.getNestingMatrix(),
							this.id,
						);
					}
				}
				this.transformation.apply(transformOp);
				this.updateChildrenIds();
				break;
			}
			case "LinkTo":
				this.linkTo.apply(op as LinkToOperation);
				break;
			case this.itemType:
				const itemOp = op as unknown as BaseItemOperation
				switch (itemOp.method) {
					case "removeChildren":
						this.applyRemoveChildren((itemOp.newData as { childIds: string[] }).childIds)
						break;
					case "addChildren":
						this.applyAddChildren((itemOp.newData as { childIds: string[] }).childIds)
						break;
					case "toggleResizeEnabled":
						this.resizeEnabled = (itemOp.newData as { resizeEnabled: boolean }).resizeEnabled;
						break;
				}
				break;
		}

		const hint = this.calculateUpdateHint(op);
		this.updateVisuals(op, hint);
	}

	protected onPropertyUpdated(property: string, value: any, prevValue: any): void {
		// Lifecycle hook for item-specific side effects.
		// Subclasses should override this and call super.onPropertyUpdated()
		this.subject.publish(this as unknown as T);
	}

	addOnRemoveCallback(cb: () => void): void {
		this.onRemoveCallbacks.push(cb);
	}

	onRemove(): void {
		this.onRemoveCallbacks.forEach((cb) => cb());
	}

	getPathMbr(): Mbr {
		return this.getMbr().copy()
	}

	isEnclosedBy(rect: Mbr): boolean {
		const parentRect = rect.getTransformed(this.getParentWorldMatrix().getInverse());
		return this.getMbrWithChildren().isEnclosedBy(parentRect);
	}

	isUnderPoint(point: Point): boolean {
		const localPoint = point.getTransformed(this.getWorldMatrix().getInverse());
		const localMbr = this.getMbr().getTransformed(this.transformation.toMatrix().getInverse());
		return localMbr.isUnderPoint(localPoint);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return this.getDistanceToPoint(point) < distance;
	}

	getDistanceToPoint(point: Point): number {
		const localPoint = point.getTransformed(this.getWorldMatrix().getInverse());
		const localMbr = this.getMbr().getTransformed(this.transformation.toMatrix().getInverse());
		return localMbr.getDistanceToPoint(localPoint);
	}

	intersectsWithLines(lines: Line[]): boolean {
		const mbr = this.getMbr();
		return lines.some((line) => line.isEnclosedOrCrossedBy(mbr));
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		const parentRect = rect.getTransformed(this.getParentWorldMatrix().getInverse());
		return this.getMbrWithChildren().isEnclosedOrCrossedBy(parentRect);
	}

	getMbrWithChildren(): Mbr {
		if (!this.index) {
			return this.getMbr();
		}
		return this.getMbr().combine(this.index.getMbr());
	}

	getPath(): Path | Paths {
		return new Path(this.getMbr().getLines(), true);
	}

	highlightMbr(): void {
		this.isHoverHighlighted = true;
		this.subject.publish(this as unknown as T);
	}

	clearHighlightMbr(): void {
		this.isHoverHighlighted = false;
		this.subject.publish(this as unknown as T);
	}

	renderHoverHighlight(context: DrawingContext): void {
		if (!this.isHoverHighlighted) {
			return;
		}
		const mbr = this.getWorldMbr();
		mbr.strokeWidth = 2 / context.matrix.scaleX;
		mbr.borderColor = BaseItem.HOVER_HIGHLIGHT_COLOR;
		mbr.render(context);
	}

	render(context: DrawingContext): void {
		if (this.index) {
			this.index.render(context);
		}
	}

	getIsScalingContainer(): boolean {
		return true;
	}

	getSnapAnchorPoints(): Point[] {
		return this.getMbr().getSnapAnchorPoints();
	}

	getPointOnEdge(point: Point, _edge?: string): Point {
		return point;
	}

	handleTransform(params: TransformParams): TransformResult {
		return {
			resizedMbr: params.mbr,
		};
	}

	getResizeType(
		point: Point,
		cameraScale: number,
		mbr: Mbr,
		anchorDistance = 5
	): ResizeType | undefined {
		return getResizeType(point, cameraScale, mbr, anchorDistance);
	}

	isBusy(): boolean {
		return false;
	}

	shouldFollowItems(): boolean {
		return false;
	}

	isAlignmentSource(): boolean {
		return true;
	}

	isReady(): boolean {
		return true;
	}

	protected calculateUpdateHint(op: Operation): UpdateHint {
		if (op.class === "Transformation") {
			const tOp = op as TransformationOperation;
			let isTranslateOnly = true;

			const checkMatrix = (current: MatrixData, prev: MatrixData) => {
				const EPS = 1e-6;
				return (
					Math.abs(current.scaleX - prev.scaleX) < EPS &&
					Math.abs(current.scaleY - prev.scaleY) < EPS &&
					Math.abs(current.shearX - prev.shearX) < EPS &&
					Math.abs(current.shearY - prev.shearY) < EPS
				);
			};

			if (tOp.method === "move" || tOp.method === "setPlacement") {
				const item = (tOp.items as (MoveItem | SetPlacementItem)[]).find(i => i.id === this.id);
				if (item) {
					isTranslateOnly = checkMatrix(item.worldMatrix, item.prevWorldMatrix);
				}
			} else if (tOp.method === "translateTo" || tOp.method === "translateBy") {
				isTranslateOnly = true;
			} else if (tOp.method === "rotateTo" || tOp.method === "rotateBy" || tOp.method === "scaleTo" || tOp.method === "scaleBy") {
				isTranslateOnly = false;
			} else {
				// Fallback for applyMatrix or others where we don't have easy prev/next comparison here
				isTranslateOnly = false;
			}

			return isTranslateOnly ? UpdateHint.TranslateOnly : UpdateHint.TransformGeometry;
		}

		if (op.method === "setProperty") {
			const setPropOp = op as SetPropertyOperation;
			return this.getPropertyUpdateHint(setPropOp.property);
		}

		if (op.class === "RichText") {
			return UpdateHint.LayoutAffecting;
		}

		return UpdateHint.FullRebuild;
	}

	/**
	 * Determines the update requirement for a specific property change.
	 * Concrete items should override this to provide hints for their own properties.
	 */
	protected getPropertyUpdateHint(property: string): UpdateHint {
		const layoutAffectingBaseProps = ["parent", "childIds"];
		const visualOnlyBaseProps = ["linkTo", "resizeEnabled", "onlyProportionalResize", "isHoverHighlighted"];

		if (layoutAffectingBaseProps.includes(property)) {
			return UpdateHint.LayoutAffecting;
		}
		if (visualOnlyBaseProps.includes(property)) {
			return UpdateHint.VisualOnly;
		}

		// Conservative default for unknown properties. 
		// Subclasses will handle their own properties.
		return UpdateHint.LayoutAffecting;
	}

	protected updateVisuals(_op: Operation, _hint: UpdateHint): void {
		// Default implementation can handle standard MBR updates if needed,
		// but most items will override this.
		this.subject.publish(this as unknown as T);
	}

	onSelectEnd(_topItem?: Item): void {
		// Default no-op
	}

	canBeInteractedWithWhileLocked(_isAiGenerating: boolean): boolean {
		return false;
	}
}
