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

export type BaseItemData = { itemType: string } & Record<string, any>;
export type SerializedItemData<T extends BaseItemData = BaseItemData> = {
	linkTo?: string;
	transformation: TransformationData;
} & T;

export class BaseItem extends Mbr implements Geometry {
	readonly transformation: Transformation;
	readonly linkTo: LinkTo;
	parent: string = "Board";
	private children: string[] | null = null;
	canBeNested = true;
	transformationRenderBlock?: boolean = undefined;
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
	) {
		super();
		this.board = board;
		this.id = id;
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

	addChildItems(children: BaseItem[]): void {
		if (!this.children) {
			return;
		}
		const childrenIds = children.map((child) => {
			child.parent = this.getId();
			return child.getId();
		});
		this.updateChildren([...this.children, ...childrenIds]);
	}

	removeChildItems(children: BaseItem[] | BaseItem): void {
		if (!this.children) {
			return;
		}
		const newChildren = Array.isArray(children) ? children : [children];
		const childrenIds = newChildren.map((child) => {
			child.parent = "Board";
			return child.getId();
		});
		this.updateChildren(this.children.filter(child => !childrenIds.includes(child)));
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

	private updateChildren(children: string[]): void {
		this.emit({
			class: this.itemType,
			method: "updateChildren",
			item: [this.getId()],
			newData: {children},
			prevData: {children: this.children}
		});
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

	applyUpdateChildren(children: string[]): void {
		if (!this.children) {
			return;
		}
		children.forEach((child) => {
			if (
				this.parent !== child &&
				this.getId() !== child
			) {
				const foundItem = this.board.items.getById(child);
				if (!this.children.includes(child) && foundItem) {
					foundItem.parent = this.getId();
				}
			}
		});
		this.children = children;
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

	apply(op: Operation | BaseOperation): void {
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
					case "updateChildren":
						this.applyUpdateChildren(op.newData.children)
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

	render(context: DrawingContext): void {}
	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		return documentFactory.createElement("div");
	}
}
