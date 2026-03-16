import { Mbr } from "Items/Mbr/Mbr";
import { Geometry } from "Items/Geometry";
import { RichText } from "Items/RichText/RichText";
import { LinkTo } from "Items/LinkTo/LinkTo";
import { Transformation } from "Items/Transformation/Transformation";
import { Board } from "Board";
import { DrawingContext } from "Items/DrawingContext";
import { DocumentFactory } from "api/DocumentFactory";
import { Operation } from "Events";
import { TransformationData } from "Items/Transformation/TransformationData";
import { BaseOperation } from "Events/EventsOperations";
import {BaseCommand, createCommand} from "Events/Command";
import {Subject} from "../../Subject";
import {Path, Paths} from "../Path";
import {BaseItemOperation} from "./BaseItemOperation";
import {SimpleSpatialIndex} from "../../SpatialIndex/SimpleSpatialIndex";
import {Point} from "../Point";
import {Matrix} from "../Transformation/Matrix";
import {ApplyMatrixOperation, TransformMany, TransformationOperation} from "../Transformation/TransformationOperations";

/**
 * Converts a world-space Transformation operation into an equivalent local-space
 * operation relative to `containerMatrix`. Used when replaying ops (including old
 * log events) against items that now store local transforms.
 *
 * Scale ratios in `applyMatrix` are coordinate-space invariant — only translation
 * deltas need to be rotated/scaled by the inverse of the container's linear transform.
 */
function toLocalTransformOp(
	op: TransformationOperation,
	containerMatrix: Matrix,
	itemId?: string,
): TransformationOperation {
	switch (op.method) {
		case 'applyMatrix': {
			const converted = op.items.map(item => {
				const local = containerMatrix.applyInverseLinear(item.matrix.translateX, item.matrix.translateY);
				return { ...item, matrix: { ...item.matrix, translateX: local.x, translateY: local.y } };
			});
			return { ...op, items: converted } as ApplyMatrixOperation;
		}
		case 'translateBy': {
			const local = containerMatrix.applyInverseLinear(op.x, op.y);
			return { ...op, x: local.x, y: local.y };
		}
		case 'translateTo': {
			// Absolute world position → local position via full inverse
			const pt = new Point(op.x, op.y);
			containerMatrix.getInverse().apply(pt);
			return { ...op, x: pt.x, y: pt.y };
		}
		case 'scaleTo': {
			// Legacy absolute scale: convert to local scale
			return { ...op, x: op.x / containerMatrix.scaleX, y: op.y / containerMatrix.scaleY };
		}
		case 'scaleByTranslateBy': {
			const local = containerMatrix.applyInverseLinear(op.translate.x, op.translate.y);
			return { ...op, translate: { x: local.x, y: local.y } };
		}
		case 'scaleByRelativeTo':
		case 'scaleToRelativeTo': {
			const pt = new Point(op.point.x, op.point.y);
			containerMatrix.getInverse().apply(pt);
			return { ...op, point: pt };
		}
		case 'transformMany': {
			if (!itemId || !op.items[itemId]) return op;
			const subOp = op.items[itemId] as TransformationOperation;
			const localSubOp = toLocalTransformOp(subOp, containerMatrix);
			return { ...op, items: { ...op.items, [itemId]: localSubOp } } as TransformMany;
		}
		default:
			// scaleBy, rotateTo, rotateBy, locked, unlocked, deserialize — no translation
			return op;
	}
}

export type BaseItemData = { itemType: string } & Record<string, any>;
export type SerializedItemData<T extends BaseItemData = BaseItemData> = {
	linkTo?: string;
	transformation: TransformationData;
	children?: string[]
} & T;

export class BaseItem extends Mbr implements Geometry {
	[key: string]: any;
	readonly transformation: Transformation;
	readonly linkTo: LinkTo;
	parent: string = "Board";
	canBeNested = true;
	transformationRenderBlock?: boolean = undefined;
	readonly index: SimpleSpatialIndex | null = null;
	board: Board;
	id: string;
	subject = new Subject<any>
	onRemoveCallbacks: (() => void)[] = []
	shouldUseCustomRender = false;
	shouldRenderOutsideViewRect = true;
	shouldUseRelativeAlignment = true;
	resizeEnabled = true;
	onlyProportionalResize = false;
	itemType = "";
	children: string[] = [];
	isHoverHighlighted = false;

	static readonly HOVER_HIGHLIGHT_COLOR = "rgba(71, 120, 245, 0.7)";

	constructor(
		board: Board,
		id = "",
		private defaultItemData?: BaseItemData,
		isGroupItem?: boolean,
	) {
		super();
		this.board = board;
		this.id = id;
		if (isGroupItem) {
			this.index = new SimpleSpatialIndex(board.camera, board.pointer);
			this.canBeNested = false;
		}
		if (defaultItemData) {
			Object.entries(defaultItemData).forEach(([key, value]) => {
				this[key] = value;
			});
		}
		this.linkTo = new LinkTo(this.id, board.events);
		this.transformation = new Transformation(this.id, board.events);
	}

	updateChildrenIds(): void {
		this.children = this.index?.items.listAll().map(item => item.getId()) || [];
	}

	/**
	 * Called when this item's parent changes. Subclasses override this to
	 * propagate the new parent to child objects (e.g. text.parent in Sticker/Shape).
	 */
	protected onParentChanged(_newParent: string): void {}

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
		if (container.itemType === "Frame") {
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
		if (this.itemType === "Frame") {
			return new Matrix(matrix.translateX, matrix.translateY, 1, 1, 0, 0);
		}
		return matrix;
	}

	setId(id: string): this {
		this.id = id;
		this.transformation.setId(id);
		this.linkTo.setId(id);
		this.getRichText()?.setId(id);
		return this;
	}

	getChildrenIds(): string[] | null {
		if (!this.index) {
			return null;
		}
		return this.index.items.listAll().map(item => item.getId());
	}

	addChildItems(children: BaseItem[]): void {
		if (!this.index) {
			return;
		}
		this.emit({
			class: this.itemType,
			method: "addChildren",
			item: [this.getId()],
			newData: {childIds: children.map(child => child.getId())},
		});
	}

	removeChildItems(children: BaseItem[] | BaseItem): void {
		if (!this.index) {
			return;
		}
		const childrenArr = Array.isArray(children) ? children : [children];
		this.emit({
			class: this.itemType,
			method: "removeChildren",
			item: [this.getId()],
			newData: {childIds: childrenArr.map(child => child.getId())},
		});
	}

	rotate(clockwise = true): void {
		this.transformation.rotateBy(clockwise ? 90 : -90);
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
		const itemMbr = isItem ? item.getMbr() : item;
		if (item instanceof BaseItem && !item.canBeNested) {
			return false;
		}
		if (options?.cancelIfChild && isItem && item.parent !== "Board") {
			return false;
		}

		const mbr = this.getMbr().copy();
		if (item.isEnclosedOrCrossedBy(mbr)) {
			if (mbr.isInside(itemMbr.getCenter())) {
				if (!options || !options.onlyForOut) {
					return true;
				}
			}
		}
		return false;
	}

	getMbr(): Mbr {
		return new Mbr(this.left, this.top, this.right, this.bottom);
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
			new Point(local.left,  local.top),
			new Point(local.right, local.top),
			new Point(local.right, local.bottom),
			new Point(local.left,  local.bottom),
		];
		for (const c of corners) parentMatrix.apply(c);
		return new Mbr(
			Math.min(corners[0].x, corners[1].x, corners[2].x, corners[3].x),
			Math.min(corners[0].y, corners[1].y, corners[2].y, corners[3].y),
			Math.max(corners[0].x, corners[1].x, corners[2].x, corners[3].x),
			Math.max(corners[0].y, corners[1].y, corners[2].y, corners[3].y),
		);
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
				this.getId() !== childId
			) {
				if (!this.index?.getById(childId) && foundItem) {
					// Convert the child's current world transform to local (relative to this container).
					// All operations in the log are world-space, so this conversion is always correct
					// whether we are processing a live user action or replaying an old event.
					const localMatrix = foundItem.transformation.toMatrix().toLocalOf(containerNestingMatrix);
					this.board.items.index.remove(foundItem);
					foundItem.parent = this.getId();
					foundItem.onParentChanged(this.getId());
					foundItem.transformation.setLocalMatrix(localMatrix);
					this.index?.insert(foundItem);
				}
			}
		});
		this.updateChildrenIds();
		this.updateMbr();
		this.subject.publish(this);
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
					this.index?.remove(foundItem);
					foundItem.parent = "Board";
					foundItem.onParentChanged("Board");
					foundItem.transformation.setLocalMatrix(worldMatrix);
					this.board.items.index.insert(foundItem);
				}
			}
		});
		this.updateChildrenIds();
		this.updateMbr();
		this.subject.publish(this);
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

	deserialize(data: SerializedItemData): this {
		if (data.children) {
			this.applyAddChildren(data.children);
		}
		Object.entries(data).forEach(([key, value]) => {
			if (this[key]?.deserialize) {
				this[key].deserialize(value);
			} else {
				this[key] = value;
			}
		});

		return this;
	}

	serialize(): SerializedItemData {
		const serializedData: SerializedItemData = {
			linkTo: this.linkTo.serialize(),
			transformation: this.transformation.serialize(),
			itemType: this.defaultItemData?.itemType || this.itemType,
			children: this.index?.list().map((child) => child.getId()),
			resizeEnabled: this.resizeEnabled,
		};
		Object.keys(this.defaultItemData || {}).forEach((key: string) => {
			const value = this[key];
			serializedData[key] = value?.serialize?.() || value;
		});

		return serializedData;
	}

	isClosed() {
		return true;
	}

	emit(operation: Operation | BaseOperation): void {
		if (this.board.events) {
			const command = new BaseCommand(this.board, [this.getId()], operation as BaseOperation);
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
		const command = createCommand(this.board, operation as Operation);
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
				newData: {resizeEnabled: false},
				prevData: {resizeEnabled: true},
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
				newData: {resizeEnabled: true},
				prevData: {resizeEnabled: false},
			});
		})
	}

	apply(op: Operation | BaseItemOperation | BaseOperation): void {
		op = op as Operation;
		switch (op.class) {
			case "Transformation": {
				let transformOp = op as TransformationOperation;
				// Items inside a container store local transforms. All operations in the log
				// are world-space, so we convert the translation deltas to local-space here.
				// This handles both live events and old log replay transparently.
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
				break;
			}
			case "LinkTo":
				this.linkTo.apply(op);
				break;
			case this.itemType:
				op = op as unknown as BaseItemOperation
				switch (op.method) {
					case "removeChildren":
						this.applyRemoveChildren(op.newData.childIds)
						break;
					case "addChildren":
						this.applyAddChildren(op.newData.childIds)
						break;
					case "toggleResizeEnabled":
						this.resizeEnabled = op.newData.resizeEnabled;
						break;
				}
		}
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
		return distance > this.getMbrWithChildren().getDistanceToPoint(point);
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
		this.subject.publish(this);
	}

	clearHighlightMbr(): void {
		this.isHoverHighlighted = false;
		this.subject.publish(this);
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

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("base-item");
		const { translateX, translateY } =
			this.transformation.getMatrixData();
		const transform = `translate(${translateX}px, ${translateY}px) scale(1, 1)`;

		div.style.backgroundColor = "#b2b0c3";
		div.id = this.getId();
		div.style.width = `${this.getWidth()}px`;
		div.style.height = `${this.getHeight()}px`;
		div.style.transformOrigin = "top left";
		div.style.transform = transform;
		div.style.position = "absolute";

		div.setAttribute("serialized-data", JSON.stringify(this.serialize()));
		return div;
	}
}
