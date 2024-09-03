import {
	Frame,
	Item,
	ItemData,
	Matrix,
	Mbr,
	ConnectorData,
	RichText,
} from "./Items";
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
import {
	SELECTION_ANCHOR_COLOR,
	SELECTION_ANCHOR_RADIUS,
	SELECTION_ANCHOR_WIDTH,
	SELECTION_COLOR,
} from "View/Tools/Selection";

export class Board {
	events: Events | undefined;
	readonly selection: Selection;
	readonly tools = new Tools(this);
	readonly pointer = new Pointer();
	readonly camera = new Camera(this.pointer, this.getCameraSnapshot());
	private index = new SpatialIndex(this.camera, this.pointer);
	items = this.index.items;
	readonly keyboard = new Keyboard();
	private drawingContext: DrawingContext | null = null;

	constructor(private boardId = "") {
		this.selection = new Selection(this, this.events);
		this.tools.navigate();
	}

	/* Connect to the server to recieve the events*/
	async connect(connection: Connection): Promise<void> {
		this.events = createEvents(this, connection);
		this.selection.events = this.events;
		const snapshot = await this.getSnapshotFromCache();
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
				return this.applyPasteOperation(op.itemsMap, op.select);
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
	 * @param translation - ids of items to draw on mbr
	 */
	drawMbrOnCanvas(
		mbr: Mbr,
		translation: TransformManyItems,
	): HTMLDivElement | undefined {
		const canvas = document.createElement("canvas");
		const width = mbr.getWidth();
		const height = mbr.getHeight();
		canvas.width = width * this.camera.getMatrix().scaleX;
		canvas.height = height * this.camera.getMatrix().scaleY;

		canvas.style.border = `1px solid ${SELECTION_COLOR}`;
		canvas.style.boxSizing = "border-box";

		const container = document.createElement("div");
		container.style.position = "relative";
		container.style.width = `${canvas.width}px`;
		container.style.height = `${canvas.height}px`;
		container.appendChild(canvas);

		const createAnchorDiv = (
			left: string,
			top: string,
			radius: number,
		): HTMLDivElement => {
			const anchorDiv = document.createElement("div");
			anchorDiv.style.position = "absolute";
			anchorDiv.style.width = `${2 * radius}px`;
			anchorDiv.style.height = `${2 * radius}px`;
			anchorDiv.style.backgroundColor = `${SELECTION_ANCHOR_COLOR}`;
			anchorDiv.style.border = `${SELECTION_ANCHOR_WIDTH}px solid ${SELECTION_COLOR}`;
			anchorDiv.style.borderRadius = "2px";
			anchorDiv.style.left = `calc(${left} - ${radius}px)`;
			anchorDiv.style.top = `calc(${top} - ${radius}px)`;
			anchorDiv.style.zIndex = "10";
			return anchorDiv;
		};

		const anchors = [
			createAnchorDiv("0%", "0%", SELECTION_ANCHOR_RADIUS),
			createAnchorDiv("100% + 1px", "0%", SELECTION_ANCHOR_RADIUS),
			createAnchorDiv("0%", "100% + 1px", SELECTION_ANCHOR_RADIUS),
			createAnchorDiv(
				"100% + 1px",
				"100% + 1px",
				SELECTION_ANCHOR_RADIUS,
			),
		];

		for (const anchor of anchors) {
			container.appendChild(anchor);
		}

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
				this.selection.renderItemMbr(
					context,
					item,
					this.camera.getMatrix().scaleX,
				);
			}
		});

		return container;
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
		this.handleNesting(newItem);
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

	getCameraSnapshot(): Matrix | undefined {
		try {
			const snap = localStorage.getItem(`camera_${this.boardId}`);
			if (snap) {
				const matrix = JSON.parse(snap);
				if (
					"translateX" in matrix &&
					"translateY" in matrix &&
					"scaleX" in matrix &&
					"scaleY" in matrix &&
					"shearX" in matrix &&
					"shearY" in matrix
				) {
					return matrix as Matrix;
				}
			}
			throw new Error();
		} catch {
			return undefined;
		}
	}

	getSnapshotFromCache(): Promise<BoardSnapshot | undefined> {
		return new Promise((resolve, reject) => {
			const dbRequest = indexedDB.open("BoardDatabase", 1);

			dbRequest.onsuccess = event => {
				const db = (event.target as IDBOpenDBRequest).result;
				const transaction = db.transaction("snapshots", "readonly");
				const store = transaction.objectStore("snapshots");
				const getRequest = store.get(this.getBoardId());

				getRequest.onsuccess = () => {
					if (getRequest.result) {
						resolve(getRequest.result.data);
					} else {
						resolve(undefined);
					}
				};

				getRequest.onerror = () => reject(getRequest.error);
			};

			dbRequest.onerror = () => reject(dbRequest.error);
		});
	}

	private async saveSnapshotToIndexedDB(
		snapshot: BoardSnapshot,
	): Promise<void> {
		const dbRequest = indexedDB.open("BoardDatabase", 1);

		dbRequest.onupgradeneeded = event => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains("snapshots")) {
				db.createObjectStore("snapshots", { keyPath: "boardId" });
			}
		};

		return new Promise((resolve, reject) => {
			dbRequest.onsuccess = event => {
				const db = (event.target as IDBOpenDBRequest).result;
				const transaction = db.transaction("snapshots", "readwrite");
				const store = transaction.objectStore("snapshots");
				store.put({ boardId: this.getBoardId(), data: snapshot });

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
			};

			dbRequest.onerror = () => reject(dbRequest.error);
		});
	}

	private async removeSnapshotFromIndexedDB(boardId: string): Promise<void> {
		const dbRequest = indexedDB.open("BoardDatabase", 1);

		return new Promise((resolve, reject) => {
			dbRequest.onsuccess = event => {
				const db = (event.target as IDBOpenDBRequest).result;
				const transaction = db.transaction("snapshots", "readwrite");
				const store = transaction.objectStore("snapshots");
				store.delete(boardId);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
			};

			dbRequest.onerror = () => reject(dbRequest.error);
		});
	}

	saveSnapshot(snapshot?: BoardSnapshot): void {
		const actualSaveSnapshot = async (
			snapshot: BoardSnapshot,
		): Promise<void> => {
			try {
				localStorage.setItem(
					`lastVisit_${this.getBoardId()}`,
					JSON.stringify(Date.now()),
				);
				await this.saveSnapshotToIndexedDB(snapshot);
			} catch {
				const firstVisit = Array.from(
					{ length: localStorage.length },
					(_, i) => i,
				).reduce((acc, i) => {
					const key = localStorage.key(i);
					if (key && key.startsWith("lastVisit")) {
						const curr = +(localStorage.getItem(key) || "");
						const currId = key.split("_")[1];
						if (!acc || curr < acc.minVal) {
							return {
								minVal: curr,
								minId: currId,
							};
						}
						return acc;
					}
					return acc;
				}, undefined as { minVal: number; minId: string } | undefined);
				if (firstVisit && firstVisit.minId !== this.getBoardId()) {
					localStorage.removeItem(`lastVisit_${firstVisit.minId}`);
					localStorage.removeItem(`camera_${firstVisit.minId}`);
					await this.removeSnapshotFromIndexedDB(firstVisit.minId);
					await actualSaveSnapshot(snapshot);
				} else if (
					firstVisit &&
					firstVisit.minId === this.getBoardId()
				) {
					console.error(
						`Not enough place in localStorage for ${this.getBoardId()} snapshot`,
					);
				}
			}
		};

		if (snapshot) {
			actualSaveSnapshot(snapshot).catch(console.error);
		} else {
			actualSaveSnapshot(this.getSnapshot()).catch(console.error);
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

	paste(itemsMap: { [key: string]: ItemData }, select = true): void {
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
			}
			if (itemData.itemType === "Frame") {
				// handle new id for children
				itemData.children = itemData.children.map(
					childId => newItemIdMap[childId],
				);
			}
			newMap[newItemId] = itemData;
		}

		this.emit({
			class: "Board",
			method: "paste",
			itemsMap: newMap,
			select,
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
			}
			if (itemData.itemType === "Frame") {
				// handle new id for children
				itemData.children = itemData.children.map(
					childId => newItemIdMap[childId],
				);
			}

			newMap[newItemId] = itemData;
		}

		this.emit({
			class: "Board",
			method: "duplicate",
			itemsMap: newMap,
		});
	}

	applyPasteOperation(
		itemsMap: { [key: string]: ItemData },
		select = true,
	): void {
		const context = this.selection.getContext();
		const items: Item[] = [];

		const sortedItemsMap = Object.entries(itemsMap).sort(
			([_, dataA], [__, dataB]) => {
				return dataA.zIndex - dataB.zIndex;
			},
		);

		const pasteItem = (itemId: string, data: unknown) => {
			if (!data) {
				throw new Error("Pasting itemId doesn't exist in itemsMap");
			}
			if (data.itemType === "Frame") {
				data.text.placeholderText = `Frame ${
					this.getMaxFrameSerial() + 1
				}`;
			}

			const item = this.createItem(itemId, data);
			this.index.insert(item);
			items.push(item);
		};

		sortedItemsMap.forEach(([id, data]) => {
			if (data.itemType === "Connector") {
				return;
			}

			pasteItem(id, data);
		});

		sortedItemsMap.forEach(([id, data]) => {
			if (data.itemType === "Connector") {
				pasteItem(id, data);
			}
		});

		items.forEach(item => this.handleNesting(item));
		this.selection.removeAll();
		if (select) {
			this.selection.add(items);
			this.selection.setContext(context);
		}
	}

	isOnBoard(item: Item): boolean {
		return this.items.findById(item.getId()) !== undefined;
	}

	/** zoomOutRelative to camera center until mbr can be viewed fully */
	fitMbrInView(mbr: Mbr): void {
		const wasEnclosed = mbr.isEnclosedBy(this.camera.getMbr());
		while (!mbr.isEnclosedBy(this.camera.getMbr())) {
			this.camera.zoomRelativeToPointBy(
				0.99,
				this.camera.getMbr().getCenter().x,
				this.camera.getMbr().getCenter().y,
			);
		}
		if (!wasEnclosed) {
			this.camera.zoomRelativeToPointBy(
				0.95,
				this.camera.getMbr().getCenter().x,
				this.camera.getMbr().getCenter().y,
			);
		}
	}

	getMaxFrameSerial(): number {
		const existingNames = this.items
			.listFrames()
			.map(frame =>
				frame.text.getTextString().length === 0
					? frame.text.placeholderText
					: frame.text.getTextString(),
			);
		return existingNames
			.map(name => name.match(/^Frame (\d+)$/))
			.filter(match => match !== null)
			.map(match => parseInt(match[1], 10))
			.reduce((max, num) => Math.max(max, num), 0);
	}
}

export interface BoardSnapshot {
	items: Record<string, ItemData>;
	events: BoardEvent[];
	lastIndex: number;
}
