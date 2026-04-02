import { Mbr } from "Items/Mbr/Mbr";
import { Line } from "Items/Line/Line";
import { Item } from "Items/Item";
import { Geometry } from "Items/Geometry";
import type { RichText } from "Items/RichText/RichText";
import { LinkTo } from "Items/LinkTo/LinkTo";
import { Transformation } from "Items/Transformation/Transformation";
import { Board } from "Board";
import { DrawingContext } from "Items/DrawingContext";
import { BaseOperation, Operation, SetPropertyOperation } from "../../Events/EventsOperations";
import { Command } from "../../Events/Command";
import { TransformationData } from "Items/Transformation/TransformationData";
import { itemSchemas } from "Items/itemSchemas";
import { BaseCommand } from "Events/BaseCommand";
import { Subject } from "../../Subject";
import { Path, Paths } from "../Path/index";
import { BaseItemOperation } from "./BaseItemOperation";
import { SimpleSpatialIndex } from "../../SpatialIndex/SimpleSpatialIndex";
import { Point } from "../Point";
import { Matrix } from "../Transformation/Matrix";
import { TransformationOperation } from "../Transformation/TransformationOperations";
import type { LinkToOperation } from "../LinkTo/LinkToOperation";
import { TransformParams, TransformResult } from "./TransformContext";
import { GeometricNormal } from "../GeometricNormal";

import { getResizeType, ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import type { ItemType } from "Items/Item";
import { toLocalTransformOp } from "./toLocalTransformOp";

export interface BaseItemData {
	itemType: string;
	transformation?: TransformationData;
	linkTo?: string;
	childIds?: string[];
	[key: string]: unknown;
}

export type SerializedItemData<T extends BaseItemData = BaseItemData> = T & {
	id: string;
	transformation: TransformationData;
};

export class BaseItem<T extends BaseItem<any> = any> implements Geometry {
	static createCommand?: (board: Board, operation: Operation) => Command;
	protected mbr = new Mbr();
	transformation: Transformation;
	linkTo: LinkTo;
	parent: string = "Board";
	canBeNested = true;
	transformationRenderBlock?: boolean = undefined;
	index: SimpleSpatialIndex | null = null;
	board: Board;
	id: string;
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

	constructor(
		board: Board,
		id = ""
	) {
		this.board = board;
		this.id = id;
		this.linkTo = new LinkTo(this.id, board.events);
		this.transformation = new Transformation(this.id, board.events);
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
	 * Returns the full world-space matrix by walking up the parent chain.
	 * For top-level items (parent === "Board") this is identical to the item's
	 * own transformation matrix. For nested items it is parentTransform × localMatrix.
	 * Note: Frames act as non-scaling containers.
	 */
	getWorldMatrix(): Matrix {
		if (this.parent === "Board") {
			return this.transformation.toMatrix();
		}
		return this.transformation.toMatrix().composeWith(this.getParentWorldMatrix());
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

	addChildItems(children: BaseItem[]): void {
		if (!this.index || children.length === 0) {
			return;
		}
		this.emit({
			class: this.itemType,
			method: "addChildren",
			item: [this.getId()],
			newData: { childIds: children.map(child => child.getId()) },
		});
	}

	removeChildItems(children: BaseItem[] | BaseItem): void {
		if (!this.index) {
			return;
		}
		const childrenArr = Array.isArray(children) ? children : [children];
		if (childrenArr.length === 0) {
			return;
		}
		this.emit({
			class: this.itemType,
			method: "removeChildren",
			item: [this.getId()],
			newData: { childIds: childrenArr.map(child => child.getId()) },
		});
	}

	rotate(degree: number): void {
		this.apply({
			class: "Transformation",
			method: "rotateBy",
			item: [this.id],
			degree,
		});
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
		this.subject.publish(this as any);
	}

	addMbr(rect: Mbr): void {
		this.mbr.addMbr(rect);
		this.subject.publish(this as any);
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
	 * For top-level items this is identical to getMbr().
	 * For nested items (parent !== "Board") it transforms the local Mbr corners
	 * through the world matrix to produce the correct world-space bounds.
	 */
	getWorldMbr(): Mbr {
		if (this.parent === "Board" || !this.parent || !this.board?.items) {
			return this.getMbr();
		}
		const container = this.board.items.getById(this.parent) as BaseItem | undefined;
		if (!container) return this.getMbr();
		const parentMatrix = this.getParentWorldMatrix();
		const local = this.getMbr();
		const corners = [
			new Point(local.left, local.top),
			new Point(local.right, local.top),
			new Point(local.right, local.bottom),
			new Point(local.left, local.bottom),
		];
		for (const c of corners) parentMatrix.apply(c);
		return new Mbr(
			Math.min(corners[0].x, corners[1].x, corners[2].x, corners[3].x),
			Math.min(corners[0].y, corners[1].y, corners[2].y, corners[3].y),
			Math.max(corners[0].x, corners[1].x, corners[2].x, corners[3].x),
			Math.max(corners[0].y, corners[1].y, corners[2].y, corners[3].y),
		);
	}

	getIntersectionPoints(segment: Line): Point[] {
		return this.mbr.getIntersectionPoints(segment);
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.mbr.getNearestEdgePointTo(point);
	}

	isInView(rect: Mbr): boolean {
		return this.getMbrWithChildren().isInView(rect);
	}

	getNormal(point: Point): GeometricNormal {
		return this.mbr.getNormal(point);
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

	updateMbr(): void {
		return;
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

		return this;
	}

	serialize(): SerializedItemData<BaseItemData> {
		return {
			id: this.id,
			linkTo: this.linkTo.serialize(),
			transformation: this.transformation.serialize(),
			itemType: this.itemType,
			childIds: this.childIds,
			resizeEnabled: this.resizeEnabled,
		};
	}

	isClosed() {
		return true;
	}

	emit(operation: Operation | BaseOperation): void {
		if (this.board.events) {
			const command = new BaseCommand(this.board, [this.getId()], operation as Operation);
			command.apply();
			this.board.events.emit(operation as Operation, command);
		} else {
			this.apply(operation);
		}
	}

	emitForManyItems(operation: Operation | BaseOperation): void {
		if (!this.board.events) {
			return;
		}
		if (!BaseItem.createCommand) {
			throw new Error("BaseItem.createCommand is not initialized");
		}
		const command = BaseItem.createCommand(this.board, operation as Operation);
		command.apply();
		this.board.events.emit(operation as Operation, command);
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

	apply(op: Operation | BaseItemOperation | BaseOperation): void {
		op = op as Operation;

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
				op = op as unknown as BaseItemOperation
				switch (op.method) {
					case "removeChildren":
						this.applyRemoveChildren((op.newData as { childIds: string[] }).childIds)
						break;
					case "addChildren":
						this.applyAddChildren((op.newData as { childIds: string[] }).childIds)
						break;
					case "toggleResizeEnabled":
						this.resizeEnabled = (op.newData as { resizeEnabled: boolean }).resizeEnabled;
						break;
				}
				break;
		}
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
		return this.getMbrWithChildren().isEnclosedBy(rect);
	}

	isUnderPoint(point: Point): boolean {
		return this.getMbrWithChildren().isUnderPoint(point);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return this.getDistanceToPoint(point) < distance;
	}

	getDistanceToPoint(point: Point): number {
		return this.getMbr().getDistanceToPoint(point);
	}

	intersectsWithLines(lines: Line[]): boolean {
		const mbr = this.getMbr();
		return lines.some((line) => line.isEnclosedOrCrossedBy(mbr));
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		return this.getMbrWithChildren().isEnclosedOrCrossedBy(rect);
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

	onSelectEnd(_topItem?: Item): void {
		// Default no-op
	}

	canBeInteractedWithWhileLocked(_isAiGenerating: boolean): boolean {
		return false;
	}
}
