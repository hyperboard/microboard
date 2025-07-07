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
import { BaseCommand } from "Events/Command";
import {Subject} from "../../Subject";
import {Path, Paths} from "../Path";
import {Item} from "../Item";
import {BaseItemOperation} from "./BaseItemOperation";
import {SimpleSpatialIndex} from "../../SpatialIndex/SimpleSpatialIndex";

export type BaseItemData = { itemType: string } & Record<string, any>;
export type SerializedItemData<T extends BaseItemData = BaseItemData> = {
	linkTo?: string;
	transformation: TransformationData;
	children?: string[]
} & T;

export class BaseItem extends Mbr implements Geometry {
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
	itemType = "";

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
		}
		if (defaultItemData) {
			Object.entries(defaultItemData).forEach(([key, value]) => {
				this[key] = value;
			});
		}
		this.linkTo = new LinkTo(this.id, board.events);
		this.transformation = new Transformation(this.id, board.events);
	}

	getId(): string {
		return this.id;
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

	applyAddChildren(childIds: string[]): void {
		if (!this.index) {
			return;
		}
		childIds.forEach((childId) => {
			const foundItem = this.board.items.getById(childId);
			if (
				this.parent !== childId &&
				this.getId() !== childId
			) {
				if (!this.index?.getById(childId) && foundItem) {
					foundItem.parent = this.getId();
					this.board.items.index.remove(foundItem);
					this.index?.insert(foundItem);
				}
			}
		});
		this.updateMbr();
		this.subject.publish(this);
	}

	applyRemoveChildren(childIds: string[]): void {
		if (!this.index) {
			return;
		}
		childIds.forEach((childId) => {
			const foundItem = this.index?.getById(childId);
			if (
				this.parent !== childId &&
				this.getId() !== childId
			) {
				if (!this.index?.getById(childId) && foundItem) {
					foundItem.parent = "Board";
					this.index?.remove(foundItem);
					this.board.items.index.insert(foundItem);
				}
			}
		});
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
			const command = new BaseCommand([this], operation as BaseOperation);
			command.apply();
			this.board.events.emit(operation as Operation, command);
		} else {
			this.apply(operation);
		}
	}

	apply(op: Operation | BaseItemOperation | BaseOperation): void {
		op = op as Operation;
		switch (op.class) {
			case "Transformation":
				this.transformation.apply(op);
				break;
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

	getPath(): Path | Paths {
		return new Path(this.getMbr().getLines());
	}

	render(context: DrawingContext): void {
		if (this.index) {
			this.index.render(context);
		}
	}

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		return documentFactory.createElement("div");
	}
}
