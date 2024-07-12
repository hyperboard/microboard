import { Frame, Item, ItemData, Matrix, Mbr, ConnectorData } from "./Items";
import { Keyboard } from "./Keyboard";
import { Pointer } from "./Pointer";
import { Selection } from "./Selection";
import { SpatialIndex } from "./SpatialIndex";
import { Tools } from "./Tools";
import { Camera } from "./Camera/";
import { Events, ItemOperation, Operation } from "./Events";
import { BoardOps, ItemsIndexRecord, RemoveItem } from "./BoardOperations";
import { BoardCommand } from "./BoardCommand";
import { ControlPointData } from "./Items/Connector/ControlPoint";
// import { Group } from "./Items/Group";
import { DrawingContext } from "./Items/DrawingContext";
import { Connection } from "App/Connection";
import { BoardEvent, createEvents } from "./Events/Events";
import { v4 as uuidv4 } from "uuid";
import { itemFactories } from "./itemFactories";
import { TransformManyItems } from "./Items/Transformation/TransformationOperations";

export class Board {
	events: Events | undefined;
	readonly selection: Selection;
	readonly tools = new Tools(this);
	readonly pointer = new Pointer();
	readonly camera = new Camera(this.pointer);
	private index = new SpatialIndex(this.camera, this.pointer);
	items = this.index.items;
	readonly keyboard = new Keyboard();
	private drawingContext: DrawingContext | null = null;

	constructor(private boardId = "") {
		this.selection = new Selection(this, this.events);
		this.tools.navigate();
	}

	/* Connect to the server to recieve the events*/
	connect(connection: Connection): void {
		this.events = createEvents(this, connection);
		this.selection.events = this.events;
		const snapshot = this.getSnapshotFromCache();
		if (snapshot && this.getSnapshot().lastIndex === 0) {
			this.deserialize(snapshot);
		}
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
		return uuidv4();
	}

	emit(operation: BoardOps): void {
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
		this.camera.setBoardId(boardId);
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
			case "Events":
				return;
			default:
				return this.applyItemOperation(op);
		}
	}

	private applyBoardOperation(op: BoardOps): void {
		switch (op.method) {
			case "moveToZIndex": {
				const item = this.index.getById(op.item);
				if (!item) {
					return;
				}
				return this.index.moveToZIndex(item, op.zIndex);
			}
			case "moveManyToZIndex": {
				for (const id in op.item) {
					const item = this.items.getById(id);
					if (!item) {
						delete op.item.id;
					}
				}

				return this.index.moveManyToZIndex(op.item);
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
				const items = op.item
					.map(item => this.items.getById(item))
					.filter((item): item is Item => item !== undefined);
				return this.index.bringManyToFront(items);
			}
			case "sendToBack": {
				const items = op.item
					.map(item => this.items.getById(item))
					.filter((item): item is Item => item !== undefined);
				return this.index.sendManyToBack(items);
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

	/** Nest item to the frame which is seen on the screen and covers the most volume of the item
	 */
	handleNesting(item: Item): void {
		const itemCenter = item.getMbr().getCenter();
		const frame = this.items
			.getFramesInView()
			.filter(frame => item.isEnclosedOrCrossedBy(frame.getMbr()))
			.reduce((acc: Frame | undefined, frame) => {
				if (
					!acc ||
					frame.getDistanceToPoint(itemCenter) >
						acc.getDistanceToPoint(itemCenter)
				) {
					acc = frame;
				}
				return acc;
			}, undefined);
		if (frame) {
			frame.handleNesting(item);
		}
	}

	/**
	 * Creates new canvas and returns it.
	 * Renders all items from translation on new canvas.
	 * @param mbr - width and height for resulting canvas
	 * @param translation - in which mbr we should find items
	 */
	drawMbrOnCanvas(
		mbr: Mbr,
		translation: TransformManyItems,
	): HTMLCanvasElement | undefined {
		const canvas = document.createElement("canvas");
		const width = mbr.getWidth() + 100;
		const height = mbr.getHeight() + 100;
		canvas.width = width * this.camera.getMatrix().scaleX;
		canvas.height = height * this.camera.getMatrix().scaleY;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			console.error(
				"drawMbrOnCanvas: Unable to get 2D context from canvasElemnt",
				canvas,
			);
			return;
		}

		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "transparent";
		ctx.fill();

		const camera = new Camera();
		const newCameraMatix = new Matrix(-mbr.left, -mbr.top, 1, 1);
		camera.matrix = newCameraMatix;

		const context = new DrawingContext(camera, ctx);

		context.setCamera(camera);
		context.ctx.setTransform(
			this.camera.getMatrix().scaleX,
			0,
			0,
			this.camera.getMatrix().scaleY,
			0,
			0,
		);
		context.matrix.applyToContext(context.ctx);

		Object.keys(translation).forEach(id => {
			const item = this.items.getById(id);
			if (item) {
				item.render(context);
				this.selection.renderItemMbr(context, item);
				this.selection.tool.render(context);
			}
		});

		return canvas;
	}

	createItem(id: string, data: ItemData): Item {
		const factory = itemFactories[data.itemType];
		if (!factory) {
			throw new Error(`Unknown item type: ${data.itemType}`);
		}
		return factory(id, data, this);
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

	moveManyToZIndex(items: ItemsIndexRecord): void {
		this.emit({
			class: "Board",
			method: "moveManyToZIndex",
			item: items,
		});
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

	bringToFront(items: Item | Item[]): void {
		if (!Array.isArray(items)) {
			items = [items];
		}
		const boardItems = this.items.listAll();

		this.emit({
			class: "Board",
			method: "bringToFront",
			item: items.map(item => item.getId()),
			prevZIndex: Object.fromEntries(
				boardItems.map(item => [
					item.getId(),
					boardItems.indexOf(item),
				]),
			),
		});
	}

	sendToBack(items: Item | Item[]): void {
		if (!Array.isArray(items)) {
			items = [items];
		}
		const boardItems = this.items.listAll();
		this.emit({
			class: "Board",
			method: "sendToBack",
			item: items.map(item => item.getId()),
			prevZIndex: Object.fromEntries(
				boardItems.map(item => [
					item.getId(),
					boardItems.indexOf(item),
				]),
			),
		});
	}

	copy(): Record<string, ItemData> {
		return this.items.index.copy();
	}

	serialize(): Record<string, ItemData> {
		return this.copy();
	}

	deserialize(snapshot: BoardSnapshot): void {
		const { items, events } = snapshot;
		/*
		this.index.clear();
		for (const key in items) {
			const itemData = items[key];
			const item = this.createItem(key, itemData);
			this.index.insert(item);
		}
		*/
		this.events?.deserialize(events);
	}

	getSnapshotFromCache(): BoardSnapshot | undefined {
		const snapshotString = localStorage.getItem(
			`board_${this.getBoardId()}`,
		);
		if (snapshotString) {
			try {
				const snapshot = JSON.parse(snapshotString);
				return snapshot;
			} catch {}
		}
		return undefined;
	}

	saveSnapshot(snapshot?: BoardSnapshot): void {
		if (snapshot) {
			localStorage.setItem(
				`board_${this.getBoardId()}`,
				JSON.stringify(snapshot),
			);
		} else {
			localStorage.setItem(
				`board_${this.getBoardId()}`,
				JSON.stringify(this.getSnapshot()),
			);
		}
	}

	getSnapshot(): BoardSnapshot {
		if (this.events) {
			return this.events.getSnapshot();
		} else {
			return {
				items: this.serialize(),
				events: [],
				lastIndex: 0,
			};
		}
	}

	paste(itemsMap: { [key: string]: ItemData }): void {
		const newItemIdMap: { [key: string]: string } = {};

		for (const itemId in itemsMap) {
			// Generate new IDs for all the items being pasted
			const newItemId = this.getNewItemId();
			newItemIdMap[itemId] = newItemId;
			if (itemsMap[itemId].itemType === "Frame") {
				itemsMap[itemId].children.forEach(childId => {
					if (!(childId in itemsMap)) {
						const child = this.items.getById(childId);
						itemsMap[childId] = child!.serialize();
						const newChildId = this.getNewItemId();
						newItemIdMap[childId] = newChildId;
					}
				});
			}
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
			const { translateX, translateY } = itemData.transformation || {
				translateX: 0,
				translateY: 0,
			};

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
			const { translateX, translateY } = itemData.transformation || {
				translateX: 0,
				translateY: 0,
			};
			if (itemData.itemType === "Connector") {
				if (itemData.startPoint.pointType === "Board") {
					itemData.startPoint.x += -minX + x;
					itemData.startPoint.y += -minY + y;
				}
				if (itemData.endPoint.pointType === "Board") {
					itemData.endPoint.x += -minX + x;
					itemData.endPoint.y += -minY + y;
				}
			} else if (itemData.transformation) {
				itemData.transformation.translateX = translateX - minX + x;
				itemData.transformation.translateY = translateY - minY + y;
				if (itemData.itemType === "Frame") {
					// handle new id for children
					itemData.children = itemData.children
						.map(childId =>
							// newItemIdMap[childId]
							newItemIdMap[childId] !== undefined
								? newItemIdMap[childId]
								: "",
						)
						.filter(childId => childId !== "");
				}
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
			const newItemId = this.getNewItemId();
			newItemIdMap[itemId] = newItemId;
			if (itemsMap[itemId].itemType === "Frame") {
				itemsMap[itemId].children.forEach(childId => {
					if (!(childId in itemsMap)) {
						const child = this.items.getById(childId);
						itemsMap[childId] = child!.serialize();
						const newChildId = this.getNewItemId();
						newItemIdMap[childId] = newChildId;
					}
				});
			}
		}

		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];

			if (itemData.itemType === "Connector") {
				replaceConnectorHeadItemId(itemData.startPoint);
				replaceConnectorHeadItemId(itemData.endPoint);
			}
		}

		const newMap: { [key: string]: ItemData } = {};
		// iterate over itemsMap to find the minimal translation
		let minX = Infinity;
		let minY = Infinity;

		for (const itemId in itemsMap) {
			const itemData = itemsMap[itemId];
			const { translateX, translateY } = itemData.transformation || {
				translateX: 0,
				translateY: 0,
			};

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
			const { translateX, translateY } = itemData.transformation || {
				translateX: 0,
				translateY: 0,
			};
			if (itemData.itemType === "Connector") {
				if (itemData.startPoint.pointType === "Board") {
					itemData.startPoint.x += -minX + right + width;
					itemData.startPoint.y += -minY + top;
				}
				if (itemData.endPoint.pointType === "Board") {
					itemData.endPoint.x += -minX + right + width;
					itemData.endPoint.y += -minY + top;
				}
			} else if (itemData.transformation) {
				itemData.transformation.translateX =
					translateX - minX + right + width;
				itemData.transformation.translateY = translateY - minY + top;
				if (itemData.itemType === "Frame") {
					// handle new id for children
					itemData.children = itemData.children
						.map(childId =>
							newItemIdMap[childId] !== undefined
								? newItemIdMap[childId]
								: "",
						)
						.filter(childId => childId !== "");
				}
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
		const items: Item[] = [];

		const pasteItem = (itemId: string): void => {
			const itemData = itemsMap[itemId];
			if (!itemData) {
				throw new Error("Pasting itemId doesn't exist in itemsMap");
			}
			const item = this.createItem(itemId, itemData);
			this.index.insert(item);
			if (
				item instanceof Frame &&
				item.text.getTextString().match(/^Frame (\d+)$/)
			) {
				item.setNameSerial(this.items.listFrames());
			}
			items.push(item);
		};

		for (const itemId in itemsMap) {
			if (itemsMap[itemId].itemType === "Connector") {
				continue;
			}
			pasteItem(itemId);
		}

		for (const itemId in itemsMap) {
			if (itemsMap[itemId].itemType === "Connector") {
				pasteItem(itemId);
			}
		}

		this.selection.removeAll();
		this.selection.add(items);
		this.selection.setContext(context);
	}

	isOnBoard(item: Item): boolean {
		return this.items.findById(item.getId()) !== undefined;
	}
}

export interface BoardSnapshot {
	items: Record<string, ItemData>;
	events: BoardEvent[];
	lastIndex: number;
}
