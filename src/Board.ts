import { BoardCommand } from "BoardCommand";
import {
  BoardOps,
  CreateItem,
  CreateLockedGroupItem,
  DataMap,
  ItemsIndexRecord,
  RemoveItem,
  RemoveLockedGroup,
} from "BoardOperations";
import { Camera } from "Camera";
import { Events, ItemOperation, Operation } from "Events";
import { SyncBoardEvent } from "Events/Events";
import { itemFactories } from "itemFactories";
import {
  Comment,
  Connector,
  ConnectorData,
  Frame,
  FrameData,
  Item,
  ItemData,
  Matrix,
  Mbr,
} from "Items";
import { AINode } from "Items/AINode";
import { ControlPointData } from "Items/Connector/ControlPoint";
import { DrawingContext } from "Items/DrawingContext";
import { Group } from "Items/Group";
import { ImageItem } from "Items/Image";
import { Keyboard } from "Keyboard";
import { parsersHTML } from "parserHTML";
import { Pointer } from "Pointer";
import { Presence } from "Presence/Presence";
import { BoardSelection } from "Selection";
import { conf } from "Settings";
import { SpatialIndex } from "SpatialIndex";
import { Subject } from "Subject";
import { Tools } from "Tools";
import { v4 as uuidv4 } from "uuid";
import { ItemsMap } from "Validators";
import { ItemDataWithId } from "./Items/Item";
import CUSTOM_WEB_COMPONENTS_JS from "./public/customWebComponents.js" with { type: "text" };
import INDEX_CSS from "./public/index.css" with { type: "text" };
import LOAD_LINKS_IMAGES_JS from "./public/loadLinkImages.js" with { type: "text" };

export type InterfaceType = "edit" | "view" | "loading";

export class Board {
  events!: Events;
  private isBoardMenuOpen = false;
  readonly selection: BoardSelection;
  readonly tools = new Tools(this);
  readonly pointer = new Pointer();
  aiGeneratingOnItem: string | undefined = undefined;
  aiImagePlaceholder: ImageItem | undefined = undefined;
  aiImageConnectorID: string | undefined = undefined;
  readonly camera: Camera = new Camera(this.pointer);
  readonly presence: Presence;
  index = new SpatialIndex(this.camera, this.pointer);
  items = this.index.items;
  readonly keyboard = new Keyboard();
  private drawingContext: DrawingContext | null = null;
  private interfaceType: InterfaceType = "loading";
  readonly subject = new Subject<void>();
  private name: string | undefined;
  private isOpen = false;

  resolveConnecting!: () => void;
  connecting = new Promise<void>((resolve) => {
    this.resolveConnecting = resolve;
  });

  constructor(
    private boardId = "",
    private accessKey?: string,
    public saveEditingFile?: () => Promise<void>
  ) {
    this.selection = new BoardSelection(this);
    this.presence = new Presence(this);
    this.tools.navigate();
  }

  /**
   * Disconnects from the connection and sets the board mode to "loading"
   */
  disconnect(): void {
    this.setInterfaceType("loading");
    this.events.connection?.unsubscribe(this);
    this.index = new SpatialIndex(this.camera, this.pointer);
    this.items = this.index.items;
    this.presence.events = this.events;
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

  getAccessKey(): string | undefined {
    return this.accessKey;
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

  apply(op: Operation): void {
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
          .map((item) => this.items.getById(item))
          .filter((item): item is Item => item !== undefined);
        // @ts-expect-error incorrect type
        return this.index.bringManyToFront(items);
      }
      case "sendToBack": {
        const items = op.item
          .map((item) => this.items.getById(item))
          .filter((item): item is Item => item !== undefined);
        // @ts-expect-error incorrect type
        return this.index.sendManyToBack(items);
      }
      case "add":
        return this.applyAddItems(op);
      case "addLockedGroup":
        return this.applyAddLockedGroupOperation(op);
      case "remove": {
        return this.applyRemoveOperation(op);
      }
      case "removeLockedGroup": {
        return this.applyRemoveLockedGroupOperation(op);
      }
      case "paste": {
        return this.applyPasteOperation(op.itemsMap);
      }
      case "duplicate": {
        return this.applyPasteOperation(op.itemsMap);
      }
    }
  }

  private applyAddItems(op: CreateItem): void {
    if (Array.isArray(op.item)) {
      const data = op.data as DataMap;
      const items = op.item.map((item) => {
        const created = this.createItem(item, data[item]);
        this.index.insert(created);
        return created;
      });
      // todo think if should be removed
      items.forEach((item) => {
        if (item instanceof Connector && data[item.getId()]) {
          const connectorData = data[item.getId()] as ConnectorData;
          item.applyStartPoint(connectorData.startPoint);
          item.applyEndPoint(connectorData.endPoint);
        }
      });
      return;
    }

    const item = this.createItem(op.item, op.data as ItemData);
    return this.index.insert(item);
  }

  private applyAddLockedGroupOperation(op: CreateLockedGroupItem): void {
    const item = this.createItem(op.item, op.data) as Group;
    const groupChildrenIds = item.getChildrenIds();
    this.index.insert(item);

    const lastChildrenId = this.index.getById(
      groupChildrenIds[groupChildrenIds.length - 1]
    );
    if (lastChildrenId) {
      const zIndex = this.index.getZIndex(lastChildrenId) + 1;
      this.index.moveToZIndex(item, zIndex);
    }

    item.getChildren().forEach((item) => {
      item.transformation.isLocked = true;
    });

    item.transformation.isLocked = true;
  }

  private applyRemoveOperation(op: RemoveItem): void {
    const removedItems: Item[] = [];
    this.findItemAndApply(op.item, (item) => {
      this.index.remove(item);
      this.selection.remove(item);

      if (item instanceof Connector) {
        item.clearObservedItems();
      }
      removedItems.push(item);
    });
  }

  private applyRemoveLockedGroupOperation(op: RemoveLockedGroup): void {
    const item = this.index.getById(op.item[0]);

    if (!item || !(item instanceof Group)) {
      return;
    }

    item.getChildren().forEach((item) => {
      item.transformation.isLocked = false;
      item.parent = "Board";
    });
    item.transformation.isLocked = false;

    const removedItems: Item[] = [];
    this.findItemAndApply(op.item, (item) => {
      this.index.remove(item);
      this.selection.remove(item);
      removedItems.push(item);
    });
  }

  private applyItemOperation(op: ItemOperation): void {
    if ("item" in op) {
      this.findItemAndApply(op.item, (item) => {
        item.apply(op);
      });
    }
  }

  private findItemAndApply(
    item: string | string[],
    apply: (item: Item) => void
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
  handleNesting(items: Item | Item[]): void {
    const arrayed = Array.isArray(items) ? items : [items];
    const framesMap = new Map<Frame, Item[]>();

    arrayed.forEach((item) => {
      const itemCenter = item.getMbr().getCenter();
      //TODO FRAMES
      const frame = this.items
        .getFramesInView()
        .filter((frame) => frame.handleNesting(item))
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
        if (!framesMap.has(frame)) {
          framesMap.set(frame, []);
        }
        framesMap.get(frame)?.push(item);
      }
    });

    framesMap.forEach((items, frame) => {
      frame.addChildItems(items);
    });
  }

  createItem(id: string, data: ItemData): Item {
    const factory = itemFactories[data.itemType];
    if (!factory) {
      throw new Error(`Unknown item type: ${data.itemType}`);
    }
    return factory(id, data, this);
  }

  parseHTML(
    el: HTMLElement
  ): ItemDataWithId | { data: FrameData; childrenMap: { [id: string]: ItemDataWithId } } {
    const parser = parsersHTML[el.tagName.toLowerCase()];
    if (!parser) {
      throw new Error(`Unknown element tag: ${el.tagName.toLowerCase()}`);
    }

    return parser(el);
  }

  add<T extends Item>(item: T, timeStamp?: number): T {
    const id = this.getNewItemId();
    this.emit({
      class: "Board",
      method: "add",
      item: id,
      data: item.serialize(),
      timeStamp,
    });
    const newItem = this.items.getById(id);
    if (!newItem) {
      throw new Error(`Add item. Item ${id} was not created.`);
    }
    this.handleNesting(newItem);
    return newItem as T;
  }

  addLockedGroup(item: Group): Item {
    const id = this.getNewItemId();
    this.emit({
      class: "Board",
      method: "addLockedGroup",
      item: id,
      data: item.serialize(),
    });
    const newItem = this.items.getById(id);
    if (!newItem) {
      throw new Error(`Add item. Item ${id} was not created.`);
    }
    this.handleNesting(newItem);
    return newItem;
  }

  remove(item: Item, withConnectors = true): void {
    let connectors: string[] = [];
    if (withConnectors) {
      connectors = this.items
        .getLinkedConnectorsById(item.getId())
        .map((connector) => connector.getId());
    }

    if ("onRemove" in item) {
      item.onRemove();
    }

    this.emit({
      class: "Board",
      method: "remove",
      item: [item.getId(), ...connectors],
    });
  }

  removeLockedGroup(item: Group): void {
    this.emit({
      class: "Board",
      method: "removeLockedGroup",
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
      item: items.map((item) => item.getId()),
      prevZIndex: Object.fromEntries(
        boardItems.map((item) => [item.getId(), boardItems.indexOf(item)])
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
      item: items.map((item) => item.getId()),
      prevZIndex: Object.fromEntries(
        boardItems.map((item) => [item.getId(), boardItems.indexOf(item)])
      ),
    });
  }

  copy(): ItemDataWithId[] {
    return this.items.index.copy();
  }

  serialize(): ItemDataWithId[] {
    return this.copy();
  }

  serializeHTML(): string {
    const customTagsScript = CUSTOM_WEB_COMPONENTS_JS;
    const loadLinksImagesScript = LOAD_LINKS_IMAGES_JS;
    const css = INDEX_CSS;
    const boardName = this.getName() || this.getBoardId();

    // div with id="items" and last-event-order are necessary for successfull uploading to storage
    const items = this.items.getWholeHTML(conf.documentFactory);
    const itemsDiv = `<div id="items">${items}</div>`;
    const scripts = `
			<script type="module">${customTagsScript}</script>
			<script defer>${loadLinksImagesScript}</script>
		`;
    const body = `<body style="overflow-x: hidden; overflow-y: hidden;">${itemsDiv}${scripts}</body>`;
    const head = `
		<head>
			<meta charset="utf-8" />
			<meta name="last-event-order" content="${this.events?.log.getLastIndex()}" />
			<title>Microboard ${this.getBoardId()}</title>
			<link rel="preconnect" href="https://fonts.googleapis.com">
			<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
			<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap"
				rel="stylesheet"
			/>
			<style>${css}</style>
			<style>
				::-webkit-scrollbar {
					appearance: none;
					width: 3px;
					height: 3px
				}
				::-webkit-scrollbar-button {
					display: none;
				}
				::-webkit-scrollbar-thumb {
					display: block;
					background-color: black;
					border-radius: 2px;
				}
				body {
					background-color: rgba(200, 200, 200, 0.2);
				}
			</style>
		</head>`.replace(/\t|\n/g, "");
    return `${head}${body}`;
  }

  /** @returns ids of added items */
  deserializeHTMLAndEmit(stringedHTML: string): string[] {
    const parser = conf.getDOMParser();
    const doc = parser.parseFromString(stringedHTML, "text/html");
    const items = doc.body.querySelector("#items");
    if (items) {
      const idsMap: Record<string, string> = {};
      const addedConnectors: { item: Connector; data: ConnectorData }[] = [];
      const data = Array.from(items.children).map((el) =>
        this.parseHTML(el as HTMLElement)
      );
      for (const parsedData of data) {
        if ("childrenMap" in parsedData) {
          // Frame
          const addedChildren = (Object.values(parsedData.childrenMap) as ItemDataWithId[]).map(
            (childData) => {
              const created = this.createItem(this.getNewItemId(), childData);
              const added = this.add(created);
              idsMap[childData.id] = added.getId();
              if (added instanceof Connector) {
                addedConnectors.push({
                  item: added,
                  data: childData as ConnectorData,
                });
              }
              return added;
            }
          );
          parsedData.data.children = addedChildren.map((item) => item.getId());
          const addedFrame = this.add(
            this.createItem(this.getNewItemId(), parsedData.data)
          );
          idsMap[parsedData.data.id] = addedFrame.getId();
        } else {
          const added = this.add(
            this.createItem(this.getNewItemId(), parsedData)
          );
          if (added instanceof Connector) {
            addedConnectors.push({
              item: added,
              data: parsedData as ConnectorData,
            });
          }
          idsMap[parsedData.id] = added.getId();
        }
      }
      addedConnectors.forEach((connector) => {
        const startData = {
          ...connector.data.startPoint,
          ...("itemId" in connector.data.startPoint
            ? { itemId: idsMap[connector.data.startPoint.itemId] }
            : {}),
        };
        const endData = {
          ...connector.data.endPoint,
          ...("itemId" in connector.data.endPoint
            ? { itemId: idsMap[connector.data.endPoint.itemId] }
            : {}),
        };

        connector.item.setStartPoint(startData);
        connector.item.setEndPoint(endData);
      });
      return Object.values(idsMap);
    }

    return [];
  }

  deserializeHTML(stringedHTML: string): void {
    const parser = conf.getDOMParser();
    const doc = parser.parseFromString(stringedHTML, "text/html");
    const itemsDiv = doc.body.querySelector("#items");
    if (!itemsDiv) {
      return;
    }
    const items = Array.from(itemsDiv.children).map((el) =>
      this.parseHTML(el as HTMLElement)
    );

    this.index.clear();
    const createdConnectors: Record<
      string,
      { item: Connector; itemData: ConnectorData & { id: string } }
    > = {};
    const createdFrames: Record<string, { item: Frame; itemData: FrameData }> =
      {};

    const addItem = (itemData: ItemData & { id: string }): Item => {
      const item = this.createItem(itemData.id, itemData);
      if (item instanceof Connector) {
        createdConnectors[itemData.id] = { item, itemData: itemData as ConnectorData & { id: string } };
      }
      if (item instanceof Frame) {
        createdFrames[item.getId()] = { item, itemData: itemData as FrameData };
      }
      this.index.insert(item);
      return item;
    };

    for (const itemData of items) {
      if ("childrenMap" in itemData) {
        // Frame
        (Object.values(itemData.childrenMap) as ItemDataWithId[]).map(
          (childData) => addItem(childData)
        );
        addItem(itemData.data);
      } else {
        addItem(itemData);
      }
    }

    for (const key in createdConnectors) {
      const { item, itemData } = createdConnectors[key];
      item.applyStartPoint(itemData.startPoint);
      item.applyEndPoint(itemData.endPoint);
    }
    for (const key in createdFrames) {
      const { item, itemData } = createdFrames[key];
      item.applyAddChild(itemData.children);
    }
  }

  deserialize(snapshot: BoardSnapshot): void {
    const { events, items } = snapshot;
    this.index.clear();
    const createdConnectors: Record<
      string,
      { item: Connector; itemData: ConnectorData & { id: string } }
    > = {};
    const createdFrames: Record<string, { item: Frame; itemData: FrameData }> =
      {};

    if (Array.isArray(items)) {
      for (const itemData of items) {
        const item = this.createItem(itemData.id, itemData);
        if (item instanceof Connector) {
          createdConnectors[itemData.id] = { item, itemData: itemData as ConnectorData & { id: string } };
        }
        if (item instanceof Frame) {
          createdFrames[item.getId()] = { item, itemData: itemData as FrameData };
        }
        this.index.insert(item);
      }
    } else {
      // TODO remove on snapshots update
      // @ts-expect-error - for older snapshots, that were {id: data}
      for (const key in items) {
        const itemData = items[key];
        const item = this.createItem(key, itemData);
        if (item instanceof Connector) {
          createdConnectors[key] = { item, itemData };
        }
        this.index.insert(item);
      }
    }

    for (const key in createdConnectors) {
      const { item, itemData } = createdConnectors[key];
      item.applyStartPoint(itemData.startPoint);
      item.applyEndPoint(itemData.endPoint);
    }
    for (const key in createdFrames) {
      const { item, itemData } = createdFrames[key];
      item.applyAddChild(itemData.children);
    }

    this.events?.log.deserialize(events);
  }

  getCameraSnapshot(): Matrix | undefined {
    try {
      if (typeof localStorage === "undefined") {
        throw new Error();
      }

      const snap = localStorage.getItem(`camera_${this.boardId}`); // Smell
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

  getItemsMbr() {
    const items = this.items.listAll();
    if (items.length > 0) {
      const rect = this.items.getMbr();
      return rect;
    }
    return new Mbr();
  }

  getSnapshotFromCache(): Promise<BoardSnapshot | undefined> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open("BoardDatabase", 2);

      dbRequest.onupgradeneeded = (_event) => {
        const db = dbRequest.result;
        if (!db.objectStoreNames.contains("snapshots")) {
          db.createObjectStore("snapshots", { keyPath: "boardId" });
        }
      };

      dbRequest.onsuccess = (_event) => {
        const db = dbRequest.result;
        if (!db.objectStoreNames.contains("snapshots")) {
          resolve(undefined);
          return;
        }
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
    snapshot: BoardSnapshot
  ): Promise<void> {
    const dbRequest = indexedDB.open("BoardDatabase", 2);

    dbRequest.onupgradeneeded = (_event) => {
      const db = dbRequest.result;
      if (!db.objectStoreNames.contains("snapshots")) {
        db.createObjectStore("snapshots", { keyPath: "boardId" });
      }
    };

    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = (_event) => {
        const db = dbRequest.result;
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
    const dbRequest = indexedDB.open("BoardDatabase", 2);

    dbRequest.onupgradeneeded = (_event) => {
      const db = dbRequest.result;
      if (!db.objectStoreNames.contains("snapshots")) {
        db.createObjectStore("snapshots", { keyPath: "boardId" });
      }
    };

    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = (_event) => {
        const db = dbRequest.result;
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
      snapshot: BoardSnapshot
    ): Promise<void> => {
      try {
        localStorage.setItem(
          `lastVisit_${this.getBoardId()}`,
          JSON.stringify(Date.now())
        );
        await this.saveSnapshotToIndexedDB(snapshot);
      } catch {
        const firstVisit = Array.from(
          { length: localStorage.length },
          (_, i) => i
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
        } else if (firstVisit && firstVisit.minId === this.getBoardId()) {
          return;
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
      return this.events.log.getSnapshot();
    } else {
      return {
        items: this.serialize(),
        events: [],
        lastIndex: 0,
      };
    }
  }

  async paste(
    itemsMap: ItemsMap,
    select = true,
    shouldUpdateMediaUsage = true
  ): Promise<void> {
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
        case "FixedConnector":
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

    const mediaStorageIds: string[] = [];

    for (const itemId in itemsMap) {
      const itemData = itemsMap[itemId];
      if (itemData.itemType === "Image") {
        mediaStorageIds.push(itemData.storageLink.split("/").pop());
      } else if (
        (itemData.itemType === "Video" && itemData.isStorageUrl) ||
        (itemData.itemType === "Audio" && itemData.isStorageUrl)
      ) {
        mediaStorageIds.push(itemData.url.split("/").pop());
      }
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
          (childId) => newItemIdMap[childId]
        );
      }
      newMap[newItemId] = itemData;
    }

    if (shouldUpdateMediaUsage) {
      const canDuplicate = mediaStorageIds.length
        ? await conf.hooks.beforeMediaUpload(mediaStorageIds, this.getBoardId())
        : true;
      if (!canDuplicate) {
        return;
      }
    }

    this.emit({
      class: "Board",
      method: "paste",
      itemsMap: newMap,
      select,
    });

    const items = Object.keys(newMap)
      .map((id) => this.items.getById(id))
      .filter((item) => typeof item !== "undefined");
    this.handleNesting(items);
    this.selection.removeAll();
    this.selection.add(items);
    this.selection.setContext("EditUnderPointer");

    return;
  }

  removeVoidComments() {
    const voidComments = this.items
      .listAll()
      .filter((item) => {
        return item instanceof Comment && !item.getThread().length
      });
    if (voidComments) {
      for (const comment of voidComments) {
        this.remove(comment);
      }
    }
  }

  getParentAINodes(node: AINode): AINode[] {
    const parentId = node.getParentId();
    if (!parentId) {
      return [];
    }
    const parentItem = this.items.findById(parentId);
    if (!parentItem || !(parentItem instanceof AINode)) {
      return [];
    }
    return [parentItem, ...this.getParentAINodes(parentItem)];
  }

  setIsBoardMenuOpen(isOpen: boolean): void {
    this.isBoardMenuOpen = isOpen;
  }

  getIsBoardMenuOpen(): boolean {
    return this.isBoardMenuOpen;
  }

  // paste(itemsMap: ItemsMap, select = true): void {
  // 	const newItemIdMap: { [key: string]: string } = {};

  // 	for (const itemId in itemsMap) {
  // 		// Generate new IDs for all the items being pasted
  // 		const newItemId = this.getNewItemId();
  // 		newItemIdMap[itemId] = newItemId;
  // 	}

  // 	// Replace connector
  // 	function replaceConnectorItem(point: ControlPointData): void {
  // 		switch (point.pointType) {
  // 			case "Floating":
  // 			case "Fixed":
  // 				const newItemId = newItemIdMap[point.itemId];
  // 				if (newItemId) {
  // 					point.itemId = newItemId;
  // 				}
  // 				break;
  // 		}
  // 	}

  // 	for (const itemId in itemsMap) {
  // 		const itemData = itemsMap[itemId];

  // 		if (itemData.itemType === "Connector") {
  // 			replaceConnectorItem(itemData.startPoint);
  // 			replaceConnectorItem(itemData.endPoint);
  // 		}
  // 	}

  // 	const newMap: { [key: string]: ItemData } = {};
  // 	// iterate over itemsMap to find the minimal translation
  // 	let minX = Infinity;
  // 	let minY = Infinity;
  // 	for (const itemId in itemsMap) {
  // 		const itemData = itemsMap[itemId];
  // 		const { translateX, translateY } = itemData.transformation || {
  // 			translateX: 0,
  // 			translateY: 0,
  // 		};

  // 		if (translateX < minX) {
  // 			minX = translateX;
  // 		}

  // 		if (translateY < minY) {
  // 			minY = translateY;
  // 		}
  // 	}

  // 	if (minX === Infinity) {
  // 		minX = 0;
  // 	}

  // 	if (minY === Infinity) {
  // 		minY = 0;
  // 	}

  // 	const { x, y } = this.pointer.point;

  // 	for (const itemId in itemsMap) {
  // 		const itemData = itemsMap[itemId];
  // 		const newItemId = newItemIdMap[itemId];
  // 		const { translateX, translateY } = itemData.transformation || {
  // 			translateX: 0,
  // 			translateY: 0,
  // 		};
  // 		if (itemData.itemType === "Connector") {
  // 			if (itemData.startPoint.pointType === "Board") {
  // 				itemData.startPoint.x += -minX + x;
  // 				itemData.startPoint.y += -minY + y;
  // 			}
  // 			if (itemData.endPoint.pointType === "Board") {
  // 				itemData.endPoint.x += -minX + x;
  // 				itemData.endPoint.y += -minY + y;
  // 			}
  // 		} else if (itemData.transformation) {
  // 			itemData.transformation.translateX = translateX - minX + x;
  // 			itemData.transformation.translateY = translateY - minY + y;
  // 		}
  // 		if (itemData.itemType === "Frame") {
  // 			// handle new id for children
  // 			itemData.children = itemData.children.map(
  // 				childId => newItemIdMap[childId],
  // 			);
  // 		}
  // 		newMap[newItemId] = itemData;
  // 	}

  // 	this.emit({
  // 		class: "Board",
  // 		method: "paste",
  // 		itemsMap: newMap,
  // 		select,
  // 	});

  // 	const items = Object.keys(newMap)
  // 		.map(id => this.items.getById(id))
  // 		.filter(item => typeof item !== "undefined");
  // 	this.handleNesting(items);
  // 	this.selection.removeAll();
  // 	this.selection.add(items);
  // 	this.selection.setContext("EditUnderPointer");

  // 	return;
  // }

  duplicate(itemsMap: { [key: string]: ItemData }): void {
    const newItemIdMap: { [key: string]: string } = {};
    for (const itemId in itemsMap) {
      // Generate new IDs for all the items being pasted
      const newItemId = this.getNewItemId();
      newItemIdMap[itemId] = newItemId;
    }

    const replaceConnectorHeadItemId = (point: ControlPointData): void => {
      switch (point.pointType) {
        case "Floating":
        case "Fixed":
        case "FixedConnector":
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
    const selectedItems = this.selection.items.list();
    const isSelectedItemsMinWidth = selectedItems.some(
      (item) => item.getMbr().getWidth() === 0
    );

    const right = mbr ? mbr.right : 0;
    const top = mbr ? mbr.top : 0;
    const width = mbr ? mbr.getWidth() / 10 : 10;
    const height = mbr ? mbr.getHeight() / 10 : 10;

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
        itemData.transformation.translateX = translateX - minX + right + width;
        itemData.transformation.translateY = translateY - minY + top;
        itemData.transformation.isLocked = false;

        if (itemData.itemType === "Drawing") {
          itemData.transformation.translateY = translateY;
        }

        if (height === 0 || isSelectedItemsMinWidth) {
          itemData.transformation.translateX = translateX + width * 10 + 10;
        }
      }
      if (itemData.itemType === "Frame") {
        // handle new id for children
        itemData.children = itemData.children.map(
          (childId) => newItemIdMap[childId]
        );
      }

      newMap[newItemId] = itemData;
    }

    this.emit({
      class: "Board",
      method: "duplicate",
      itemsMap: newMap,
    });

    const items = Object.keys(newMap)
      .map((id) => this.items.getById(id))
      .filter((item) => typeof item !== "undefined");
    this.handleNesting(items);
    this.selection.removeAll();
    this.selection.add(items);
    this.selection.setContext("EditUnderPointer");
  }

  applyPasteOperation(itemsMap: { [key: string]: ItemData }): void {
    const items: Item[] = [];

    const sortedItemsMap = Object.entries(itemsMap).sort(
      ([, dataA], [, dataB]) => {
        if ("zIndex" in dataA && "zIndex" in dataB) {
          return dataA.zIndex - dataB.zIndex;
        }
        return 0;
      }
    );

    const pasteItem = (itemId: string, data: ItemData): void => {
      if (!data) {
        throw new Error("Pasting itemId doesn't exist in itemsMap");
      }

      if (data.itemType === "Frame") {

        data.text.placeholderText = `Frame ${this.getMaxFrameSerial() + 1}`;
      }

      const item = this.createItem(itemId, data);
      this.index.insert(item);
      items.push(item);
    };

    sortedItemsMap.map(([id, data]) => {
      if (data.itemType === "Connector") {
        return;
      }

      return pasteItem(id, data);
    });

    sortedItemsMap.map(([id, data]) => {
      if (data.itemType === "Connector") {
        return pasteItem(id, data);
      }
      return;
    });
  }

  isOnBoard(item: Item): boolean {
    return this.items.findById(item.getId()) !== undefined;
  }

  getMaxFrameSerial(): number {
    const existingNames = this.items
      .listFrames()
      .map((frame) =>
        frame.text.getTextString().length === 0
          ? frame.text.placeholderText
          : frame.text.getTextString()
      );
    return existingNames
      .map((name) => name.match(/^Frame (\d+)$/))
      .filter((match) => match !== null)
      .map((match) => parseInt(match[1], 10))
      .reduce((max, num) => Math.max(max, num), 0);
  }

  setInterfaceType(interfaceType: InterfaceType): void {
    this.interfaceType = interfaceType;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      this.tools.select();
    }
    if (interfaceType === "view") {
      this.tools.navigate();
    }
    this.subject.publish();
    this.tools.publish();
  }

  getInterfaceType() {
    return this.interfaceType;
  }

  setName(name: string | undefined): void {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  setIsOpen(isOpen: boolean) {
    this.isOpen = isOpen;
  }

  getIsOpen() {
    return this.isOpen;
  }

  cleanup() {
    this.selection.quickAddButtons.clear();
    this.presence.cleanup();
  }
}

export interface BoardSnapshot {
  items: (ItemData & { id: string })[];
  events: SyncBoardEvent[];
  lastIndex: number;
}
