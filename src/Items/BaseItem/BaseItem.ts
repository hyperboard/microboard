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

export type BaseItemData = { itemType: string } & Record<string, any>;
export type SerializedItemData<T extends BaseItemData = BaseItemData> = {
	linkTo?: string;
	transformation: TransformationData;
} & T;

export class BaseItem extends Mbr implements Geometry {
	readonly transformation: Transformation;
	readonly linkTo: LinkTo;
	parent: string = "Board";
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
		}
	}

	addOnRemoveCallback(cb: () => void): void {
		this.onRemoveCallbacks.push(cb);
	}

	onRemove(): void {
		this.onRemoveCallbacks.forEach((cb) => cb());
	}

	render(context: DrawingContext): void {}
	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		return documentFactory.createElement("div");
	}
}
