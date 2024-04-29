import { Mbr, Connector, RichText, Shape } from "./Items";
import { Item, ItemData } from "./Items";
import { Keyboard } from "./Keyboard";
import { Pointer } from "./Pointer";
import { Selection } from "./Selection";
import { SpatialIndex } from "./SpatialIndex";
import { Tools } from "./Tools";
import { Camera } from "./Camera/";
import { Events, ItemOperation, Operation } from "./Events";
import { BoardOperation, RemoveItem } from "./BoardOperations";
import { BoardCommand } from "./BoardCommand";
import { ControlPointData } from "./Items/Connector/ControlPoint";
import { ImageItem } from "./Items/Image";
import { Drawing } from "./Items/Drawing";
import { Group } from "./Items/Group";
import { Sticker } from "./Items/Sticker";
import { DrawingContext } from "./Items/DrawingContext";
import { Connection } from "App/Connection";

export class Board {
	events: Events | undefined;
	readonly selection: Selection;
	readonly tools = new Tools(this);
	readonly pointer = new Pointer();
	readonly camera = new Camera(this.pointer);
	private index = new SpatialIndex(this.camera, this.pointer);
	items = this.index.items;
	readonly keyboard = new Keyboard();
	private itemCounter = 0;
	private drawingContext: DrawingContext | null = null;

	constructor(private boardId = "") {
		this.selection = new Selection(this, this.events);
		this.tools.navigate();
	}

	/* Connect to the server to recieve the events*/
	connect(connection: Connection): void {
		this.events = new Events(this, connection);
		this.selection.events = this.events;
	}

	disconnect(): void {
		if (!this.events) {
			return;
		}
		this.events.disconnect();
		this.events = undefined;
		this.index = new SpatialIndex(this.camera, this.pointer);
		this.items = this.index.items;
		this.selection.events = this.events;
	}

	getNewItemId(): string {
		if (this.events) {
			return this.events.getNewItemId();
		} else {
			return this.boardId + ":" + this.itemCounter++;
		}
	}

	emit(operation: BoardOperation): void {
		if (this.events) {
			const command = new BoardCommand(this, operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	getBoardId(): string {
		return this.boardId;
	}

	setBoardId(boardId: string): void {
		this.boardId = boardId;
	}

	getDrawingContext(): DrawingContext | null {
		return this.drawingContext;
	}

	setDrawingContext(context: DrawingContext): void {
		this.drawingContext = context;
	}

	apply(op: Operation): void | false {
		switch (op.class) {
			case "Board":
				return this.applyBoardOperation(op);
			default:
				return this.applyItemOperation(op);
		}
	}

	private applyBoardOperation(op: BoardOperation): void {
		switch (op.method) {
			case "moveToZIndex": {
				const item = this.index.getById(op.item);
				if (!item) {
					return;
				}
				return this.index.moveToZIndex(item, op.zIndex);
			}
			case "moveSecondBeforeFirst": {
				const first = this.items.getById(op.item);
				const second = this.items.getById(op.secondItem);
				if (!first || !second) {
					return;
				}
				return this.index.moveSecondBeforeFirst(first, second);
			}
			case "moveSecondAfterFirst":
				const first = this.items.getById(op.item);
				const second = this.items.getById(op.secondItem);
				if (!first || !second) {
					return;
				}
				return this.index.moveSecondAfterFirst(first, second);
			case "bringToFront": {
				const item = this.items.getById(op.item);
				if (!item) {
					return;
				}
				return this.index.bringToFront(item);
			}
			case "sendToBack": {
				const item = this.items.getById(op.item);
				if (!item) {
					return;
				}
				return this.index.sendToBack(item);
			}
			case "add":
				const item = this.createItem(op.item, op.data);
				return this.index.insert(item);
			case "remove": {
				return this.applyRemoveOperation(op);
			}
			case "paste": {
				return this.applyPasteOperation(op.itemsMap);
			}
			case "duplicate": {
				return this.applyPasteOperation(op.itemsMap);
			}
		}
	}

	private applyRemoveOperation(op: RemoveItem): void {
		this.findItemAndApply(op.item, item => {
			this.index.remove(item);
			this.selection.remove(item);
		});
	}

	private applyItemOperation(op: ItemOperation): void {
		this.findItemAndApply(op.item, item => {
			item.apply(op);
		});
	}

	private findItemAndApply(
		item: string | string[],
		apply: (item: Item) => void,
	): void {
		if (Array.isArray(item)) {
			for (const itemId of item) {
				const found = this.items.findById(itemId);
				if (found) {
					apply(found);
				}
			}
		} else {
			const found = this.items.findById(item);
			if (found) {
				apply(found);
			}
		}
	}

	createItem(id: string, data: ItemData): Item {
		switch (data.itemType) {
			case "Sticker":
				return new Sticker(this.events).setId(id).deserialize(data);
			case "Shape":
				return new Shape(this.events).setId(id).deserialize(data);
			case "RichText":
				return new RichText(new Mbr(), id, this.events)
					.setId(id)
					.setBoard(this)
					.deserialize(data);
			case "Connector":
				return new Connector(this, this.events)
					.setId(id)
					.deserialize(data);
			case "Image":
				return new ImageItem(data.dataUrl, this.events, id)
					.setId(id)
					.deserialize(data);
			case "Drawing":
				return new Drawing([]).setId(id).deserialize(data);
			case "Group":
				return new Group(this.events).setId(id).deserialize(data);
		}
	}

	add<T extends Item>(item: T): T {
		const id = this.getNewItemId();
		this.emit({
			class: "Board",
			method: "add",
			item: id,
			data: item.serialize(),
		});
		const newItem = this.items.getById(id);
		if (!newItem) {
			throw new Error("Add item. Item was not created.");
		}
		return newItem as T;
	}

	remove(item: Item): void {
		this.emit({
			class: "Board",
			method: "remove",
			item: [item.getId()],
		});
	}

	getByZIndex(index: number): Item {
		return this.index.getByZIndex(index);
	}

	getZIndex(item: Item): number {
		return this.index.getZIndex(item);
	}

	getLastZIndex(): number {
		return this.index.getLastZIndex();
	}

	moveToZIndex(item: Item, zIndex: number): void {
		this.emit({
			class: "Board",
			method: "moveToZIndex",
			item: item.getId(),
			zIndex: zIndex,
		});
	}

	moveSecondBeforeFirst(first: Item, second: Item): void {
		this.emit({
			class: "Board",
			method: "moveSecondBeforeFirst",
			item: first.getId(),
			secondItem: second.getId(),
		});
	}

	moveSecondAfterFirst(first: Item, second: Item): void {
		this.emit({
			class: "Board",
			method: "moveSecondAfterFirst",
			item: first.getId(),
			secondItem: second.getId(),
		});
	}

	bringToFront(item: Item): void {
		this.emit({
			class: "Board",
			method: "bringToFront",
			item: item.getId(),
		});
	}

	sendToBack(item: Item): void {
		this.emit({
			class: "Board",
			method: "sendToBack",
			item: item.getId(),
		});
	}

	paste(itemsMap: { [key: string]: ItemData }): void {
		const newItemIdMap: { [key: string]: string } = {};

		for (const itemId in itemsMap) {
			// Generate new IDs for all the items being pasted
			const newItemId = this.getNewItemId();
			newItemIdMap[itemId] = newItemId;
		}

		// Replace connector
		function replaceConnectorItem(point: ControlPointData): void {
			switch (point.pointType) {
				case "Floating":
				case "Fixed":
					const newItemId = newItemIdMap[point.itemId];
					if (newItemId) {
						point.itemId = newItemId;
					}
					break;
			}
		}

		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];

			if (itemData.itemType === "Connector") {
				replaceConnectorItem(itemData.startPoint);
				replaceConnectorItem(itemData.endPoint);
			}
		}

		const newMap: { [key: string]: ItemData } = {};
		// iterate over itemsMap to find the minimal translation
		let minX = Infinity;
		let minY = Infinity;
		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];
			const { translateX, translateY } = itemData.transformation;

			if (translateX < minX) {
				minX = translateX;
			}

			if (translateY < minY) {
				minY = translateY;
			}
		}

		if (minX === Infinity) {
			minX = 0;
		}

		if (minY === Infinity) {
			minY = 0;
		}

		const { x, y } = this.pointer.point;

		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];
			const newItemId = newItemIdMap[itemId];
			const { translateX, translateY } = itemData.transformation;
			if (itemData.itemType === "Connector") {
				if (itemData.startPoint.pointType === "Board") {
					itemData.startPoint.x += -minX + x;
					itemData.startPoint.y += -minY + y;
				}
				if (itemData.endPoint.pointType === "Board") {
					itemData.endPoint.x += -minX + x;
					itemData.endPoint.y += -minY + y;
				}
			} else {
				itemData.transformation.translateX = translateX - minX + x;
				itemData.transformation.translateY = translateY - minY + y;
			}
			newMap[newItemId] = itemData;
		}

		this.emit({
			class: "Board",
			method: "paste",
			itemsMap: newMap,
		});

		return;
	}

	duplicate(itemsMap: { [key: string]: ItemData }): void {
		const newItemIdMap: { [key: string]: string } = {};

		const replaceConnectorHeadItemId = (point: ControlPointData): void => {
			switch (point.pointType) {
				case "Floating":
				case "Fixed":
					const newItemId = newItemIdMap[point.itemId];
					if (newItemId) {
						point.itemId = newItemId;
					}
					break;
			}
		};

		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];

			if (itemData.itemType === "Connector") {
				replaceConnectorHeadItemId(itemData.startPoint);
				replaceConnectorHeadItemId(itemData.endPoint);
			}

			const newItemId = this.getNewItemId();
			newItemIdMap[itemId] = newItemId;
		}

		const newMap: { [key: string]: ItemData } = {};
		// iterate over itemsMap to find the minimal translation
		let minX = Infinity;
		let minY = Infinity;

		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];
			const { translateX, translateY } = itemData.transformation;

			if (translateX < minX) {
				minX = translateX;
			}

			if (translateY < minY) {
				minY = translateY;
			}
		}

		if (minX === Infinity) {
			minX = 0;
		}

		if (minY === Infinity) {
			minY = 0;
		}

		const mbr = this.selection.getMbr();
		const right = mbr ? mbr.right : 0;
		const top = mbr ? mbr.top : 0;
		const width = mbr ? mbr.getWidth() / 10 : 10;

		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];
			const newItemId = newItemIdMap[itemId];
			const { translateX, translateY } = itemData.transformation;
			if (itemData.itemType === "Connector") {
				if (itemData.startPoint.pointType === "Board") {
					itemData.startPoint.x += -minX + right + width;
					itemData.startPoint.y += -minY + top;
				}
				if (itemData.endPoint.pointType === "Board") {
					itemData.endPoint.x += -minX + right + width;
					itemData.endPoint.y += -minY + top;
				}
			} else {
				itemData.transformation.translateX =
					translateX - minX + right + width;
				itemData.transformation.translateY = translateY - minY + top;
			}

			newMap[newItemId] = itemData;
		}

		this.emit({
			class: "Board",
			method: "duplicate",
			itemsMap: newMap,
		});
	}

	applyPasteOperation(itemsMap: { [key: string]: ItemData }): void {
		const context = this.selection.getContext();
		const items = [];

		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];
			const item = this.createItem(itemId, itemData);
			this.index.insert(item);
			items.push(item);
		}

		this.selection.removeAll();
		this.selection.add(items);
		this.selection.setContext(context);
	}

	isOnBoard(item: Item): boolean {
		return this.items.findById(item.getId()) !== undefined;
	}
}
