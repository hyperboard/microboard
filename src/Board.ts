import { BoardCommand } from "BoardCommand";
import {
  BoardOps,
  CreateItem,
  CreateLockedGroupItem,
  DataMap,
  ItemsIndexRecord,
  RemoveGroup,
  RemoveItem,
  RemoveLockedGroup,
  CreateGroup,
} from "BoardOperations";
import { Camera } from "Camera";
import { Events, ItemOperation, Operation } from "Events";
import { SyncBoardEvent } from "Events/Events";
import { Matrix } from "Geometry/Transformation/Matrix";
import { Mbr } from "Geometry/Mbr/Mbr";
import type { Comment } from "Items/Comment/Comment";
import type { Connector } from "Items/Connector/Connector";
import { connectorOps } from "Items/Connector/connectorOps";
import type { ConnectorData } from "Items/Connector/ConnectorOperations";
import type { Frame } from "Items/Frame/Frame";
import type { FrameData } from "Items/Frame/FrameData";
import type { Item, ItemData } from "Items/Item";
import type { AINode } from "Items/AINode";
import { ControlPointData } from "Items/Connector/ControlPoint";
import { drawBackground } from "Background";
import { DrawingContext } from "Geometry/DrawingContext";
import type { Group, GroupData } from "Items/Group";
import type { ImageItem } from "Items/Image";
import { Keyboard } from "Keyboard";
import {
  deserializeHTMLAndEmitToBoard,
  deserializeHTMLToBoard,
  parseHTML,
  serializeBoardToHTML,
} from "HTMLAdapter/BoardHTMLAdapter";
import { Pointer } from "Pointer";
import { cursorsMap } from "Pointer/Pointer";
import { Presence } from "Presence/Presence";
import { BoardSelection } from "Selection";
import { conf, Theme } from "Settings";
import { SpatialIndex } from "SpatialIndex";
import { Subject } from "Subject";
import { Tools } from "Tools";
import "Tools/initTools";
import { v4 as uuidv4 } from "uuid";
import { ItemsMap } from "Validators";
import type { BaseItem } from "./Items/BaseItem";
import type { BaseItemData } from "./Items/BaseItem/BaseItem";
import { ItemDataWithId } from "./Items/Item";
import { Account } from "types/Account";
import { GravityEngine } from "./Gravity/GravityEngine";
import { ForceGraphEngine } from './ForceGraph/ForceGraphEngine';
import {
  itemFactories,
} from "./itemFactories";
import {
  isAINodeData,
  isAudioItemData,
  isConnectorData,
  isFrameData,
  isImageItemData,
  isVideoItemData,
  isStickerData,
  isGroupData,
} from "RegistryMaps";

export type InterfaceType = "edit" | "view" | "loading";

export class Board {
  events!: Events;
  public isBoardMenuOpen = false;
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
    public saveEditingFile?: () => Promise<void>,
    private account?: Account,
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

  getAccount(): Account | null {
    return this.account || null;
  }

  getTheme(): Theme {
    return conf.theme;
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

  render(context: DrawingContext): void {
    context.clear();
    drawBackground(context);
    this.index.items.render(context);
    this.selection.render(context);
    this.tools.render(context);
    this.presence.render(context);
  }

  apply(op: Operation): void {
    switch (op.class) {
      case "Board":
        return this.applyBoardOperation(op as any);
      case "Events":
        return;
      default:
        return this.applyItemOperation(op as any);
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
        return this.index.bringManyToFront(items);
      }
      case "sendToBack": {
        const items = op.item
          .map((item) => this.items.getById(item))
          .filter((item): item is Item => item !== undefined);
        return this.index.sendManyToBack(items);
      }
      case "add":
        return this.applyAddItems(op);
      case "addLockedGroup":
        return this.applyAddLockedGroupOperation(op);
      case "addGroup":
      case "addLockedGroup":
        return this.applyAddGroupOperation(op as CreateGroup | CreateLockedGroupItem);
      case "remove": {
        return this.applyRemoveOperation(op);
      }
      case "removeGroup":
      case "removeLockedGroup":
        return this.applyRemoveGroupOperation(op as RemoveGroup | RemoveLockedGroup);
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
        if (item.itemType === "Connector" && data[item.getId()]) {
          const connector = item as Connector;
          const connectorData = data[item.getId()] as ConnectorData;
          connector.apply(connectorOps.setStartPoint([connector], connectorData.startPoint));
          connector.apply(connectorOps.setEndPoint([connector], connectorData.endPoint));
        }
      });
      return;
    }

    const item = this.createItem(op.item, op.data as ItemData);
    return this.index.insert(item);
  }

  private applyAddLockedGroupOperation(op: CreateLockedGroupItem): void {
    const item = this.createItem(op.item, op.data) as Group;
    const groupChildrenIds = op.data.childIds || [];
    const lastChildrenId = this.index.getById(
      groupChildrenIds?.[groupChildrenIds.length - 1] ?? ""
    );
    this.index.insert(item);
    if (groupChildrenIds.length > 0) {
      item.applyAddChildren(groupChildrenIds);
    }

    if (lastChildrenId) {
      const zIndex = this.index.getZIndex(lastChildrenId) + 1;
      this.index.moveToZIndex(item, zIndex);
    }

    item.isLockedGroup = true;
    item.getChildren().forEach((item) => {
      item.transformation.isLocked = true;
    });

    item.transformation.isLocked = true;
  }

  private applyAddGroupOperation(op: CreateGroup | CreateLockedGroupItem): void {
    const item = this.createItem(op.item, op.data) as Group;
    const groupChildrenIds = op.data.childIds || [];
    const lastChildrenId = this.index.getById(
      groupChildrenIds[groupChildrenIds.length - 1]
    );
    this.index.insert(item);
    if (groupChildrenIds.length > 0) {
      item.applyAddChildren(groupChildrenIds);
    }

    if (lastChildrenId) {
      const zIndex = this.index.getZIndex(lastChildrenId) + 1;
      this.index.moveToZIndex(item, zIndex);
    }

    item.isLockedGroup = false;
  }

  private applyRemoveOperation(op: RemoveItem): void {
    const removedItems: Item[] = [];
    this.findItemAndApply(op.item, (item) => {
      this.index.remove(item);
      this.selection.remove(item);

      if (item.itemType === "Connector") {
        (item as Connector).clearObservedItems();
      }
      removedItems.push(item);
    });
  }

  private applyRemoveGroupOperation(op: RemoveGroup | RemoveLockedGroup): void {
    const item = this.index.getById(op.item[0]);

    if (!item || item.itemType !== "Group") {
      return;
    }

    const children = [...(item as Group).getChildren()];
    (item as Group).applyRemoveChildren(children.map((child) => child.getId()));
    children.forEach((child) => {
      child.transformation.isLocked = false;
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
    } else if ("items" in op && Array.isArray(op.items)) {
      const ids = op.items.map((i: any) => (typeof i === "string" ? i : i.id));
      this.findItemAndApply(ids, (item) => {
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
    const groupsMap = new Map<BaseItem, Item[]>();

    arrayed.forEach((item) => {
      const itemCenter = item.getMbr().getCenter();
      const groupsInView = this.items.getGroupItemsInView();
      
      const groupItem = groupsInView
        .filter((groupItem) => groupItem !== item)
        .filter((groupItem) => {
          const canNest = groupItem.handleNesting(item);
          return canNest;
        })
        .reduce((acc: BaseItem | undefined, groupItem) => {
          if (
            !acc ||
            groupItem.getDistanceToPoint(itemCenter) <
            acc.getDistanceToPoint(itemCenter)
          ) {
            acc = groupItem;
          }
          return acc;
        }, undefined);

      if (groupItem) {
        if (!groupsMap.has(groupItem)) {
          groupsMap.set(groupItem, []);
        }
        groupsMap.get(groupItem)?.push(item);
      }
    });

    groupsMap.forEach((items, group) => {
      group.addChildItems(items);
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
  ):
    | ItemDataWithId
    | { data: BaseItemData & { id: string }; childrenMap: { [id: string]: ItemDataWithId } } {
    return parseHTML(el);
  }

  add<T extends Item>(item: T, timeStamp?: number): T {
    const id = item.getId() || this.getNewItemId();
    if (!item.getId()) {
      item.setId(id);
    }
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

  /**
   * High-level method to create and add an item in one step.
   * Useful for UI components and converters.
   */
  createItemAndAdd<T extends Item>(itemType: string, data: Partial<ItemData>, timeStamp?: number): T {
    const id = (data as any).id || this.getNewItemId();
    const fullData = { ...data, itemType, id } as ItemData;
    const item = this.createItem(id, fullData);
    
    // Some items might need special initialization that deserialize doesn't cover
    // or that should happen before adding to the board.
    if (item.itemType === "Connector" && (data as any).startPoint && (data as any).endPoint) {
       const conn = item as any;
       conn.apply({ class: "Connector", method: "setStartPoint", startPointData: (data as any).startPoint });
       conn.apply({ class: "Connector", method: "setEndPoint", endPointData: (data as any).endPoint });
    }

    return this.add(item as T, timeStamp);
  }

  addLockedGroup(items: BaseItem[]): Group {
    const id = this.getNewItemId();
    const groupData: GroupData = {
      itemType: "Group",
      childIds: items.map((i) => i.getId()),
      transformation: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, rotate: 0, isLocked: false },
      isLockedGroup: true,
    };
    this.emit({
      class: "Board",
      method: "addLockedGroup",
      item: id,
      data: groupData,
    });
    return this.items.getById(id) as Group;
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

  /**
   * Creates a Group containing the given items.
   * Items are moved from the board into the group's local coordinate space.
   * Returns the newly created Group.
   */
  group(items: BaseItem[]): Group {
    const id = this.getNewItemId();
    const groupData: GroupData = {
      itemType: "Group",
      childIds: items.map((i) => i.getId()),
      transformation: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, rotate: 0, isLocked: false },
      isLockedGroup: false,
    };
    this.emit({
      class: "Board",
      method: "addGroup",
      item: id,
      data: groupData,
    });
    return this.items.getById(id) as Group;
  }

  /**
   * Dissolves a Group, returning its children to the board with world-space transforms.
   */
  ungroup(group: Group): void {
    this.emit({
      class: "Board",
      method: "removeGroup",
      item: [group.getId()],
    });
  }

  /**
   * Removes a single item from its parent group, placing it back on the board
   * at its current world position. If the group becomes empty after detach, the
   * group itself is dissolved.
   */
  detachFromGroup(item: BaseItem): void {
    if (item.parent === "Board") {
      return;
    }
    const parentGroup = this.items.getById(item.parent) as Group | undefined;
    if (!parentGroup || parentGroup.itemType !== "Group") {
      return;
    }
    parentGroup.removeChildItems([item]);
    if (parentGroup.getChildrenIds().length === 0) {
      this.ungroup(parentGroup);
    }
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
    return serializeBoardToHTML(this);
  }

  /** @returns ids of added items */
  deserializeHTMLAndEmit(stringedHTML: string): string[] {
    return deserializeHTMLAndEmitToBoard(this, stringedHTML);
  }

  deserializeHTML(stringedHTML: string): void {
    deserializeHTMLToBoard(this, stringedHTML);
  }

  deserialize(snapshot: BoardSnapshot): void {
    const { events, items } = snapshot;
    this.index.clear();
    const createdConnectors: Record<
      string,
      { item: Connector; itemData: ConnectorData & { id: string } }
    > = {};
    const createdGroups: Record<
      string,
      { item: Item; itemData: BaseItemData }
    > = {};

    if (Array.isArray(items)) {
      for (const itemData of items) {
        const item = this.createItem(itemData.id, itemData);
        if (item.itemType === "Connector") {
          createdConnectors[itemData.id] = {
            item: item as Connector,
            itemData: itemData as ConnectorData & { id: string },
          };
        }
        if ("index" in item && item.index) {
          createdGroups[item.getId()] = {
            item,
            itemData: itemData as BaseItemData,
          };
        }
        this.index.insert(item);
      }
    } else {
      // TODO remove on snapshots update
      // This branch handles older snapshots where 'items' was an object {id: data}
      const itemsMap = items as Record<string, ItemData>;
      for (const key in itemsMap) {
        const itemData = itemsMap[key];
        const item = this.createItem(key, itemData);
        if (isConnectorData(itemData)) {
          createdConnectors[key] = {
            item: item as Connector,
            itemData: itemData as ConnectorData & { id: string }
          };
        }
        this.index.insert(item);
      }
    }

    for (const key in createdConnectors) {
      const { item, itemData } = createdConnectors[key];
      item.apply(connectorOps.setStartPoint([item as Connector], itemData.startPoint));
      item.apply(connectorOps.setEndPoint([item as Connector], itemData.endPoint));
    }
    for (const key in createdGroups) {
      const { item, itemData } = createdGroups[key];
      const itemDataWithChildren = itemData as BaseItemData & { childIds?: string[]; children?: string[] };
      const childIds = itemDataWithChildren.childIds || itemDataWithChildren.children;
      if (childIds) {
        // Only run applyAddChildren if the children's parent is not already set correctly.
        // This handles legacy snapshots that rely on childIds for hierarchy reconstruction.
        const needsLegacyReparent = childIds.some(id => {
          const child = this.index.getById(id) as BaseItem | undefined;
          return child && child.parent !== item.getId();
        });
        
        if (needsLegacyReparent) {
          (item as BaseItem).applyAddChildren(childIds);
        } else {
          // New snapshots: parents are already set, just ensure they are in the group's index.
          childIds.forEach(id => {
            const child = this.index.getById(id);
            if (child) (item as any).index?.insert(child);
          });
          (item as any).updateChildrenIds?.();
        }
      }
    }

    if (events.length) {
      this.events?.log.deserialize(events);
    }
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

      if (isConnectorData(itemData)) {
        replaceConnectorItem(itemData.startPoint);
        replaceConnectorItem(itemData.endPoint);
      }
    }

    const newMap: { [key: string]: ItemData } = {};

    // Collect all child IDs from container items (Frame, Group) and map each
    // child back to its parent so we can compute new world coords for children.
    const childItemIds = new Set<string>();
    const childToParent = new Map<string, string>(); // childId → parentId
    for (const itemId in itemsMap) {
      const d = itemsMap[itemId] as Record<string, unknown>;
      if (Array.isArray(d.childIds)) {
        for (const cid of d.childIds as string[]) {
          childItemIds.add(cid);
          childToParent.set(cid, itemId);
        }
      }
    }


    // iterate over itemsMap to find the minimal translation
    let minX = Infinity;
    let minY = Infinity;
    for (const itemId in itemsMap) {
      if (childItemIds.has(itemId)) continue; // skip children — they have local coords
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

    // Snapshot original translations BEFORE the update loop — transformations are
    // mutated in-place, so reading parentData.transformation later would give the
    // already-updated value and double-apply the offset for children.
    const originalTranslations = new Map<string, { tx: number; ty: number }>();
    for (const itemId in itemsMap) {
      const t = itemsMap[itemId].transformation;
      originalTranslations.set(itemId, { tx: t?.translateX ?? 0, ty: t?.translateY ?? 0 });
    }

    const mediaStorageIds: string[] = [];

    for (const itemId in itemsMap) {
      const itemData = itemsMap[itemId];
      if (isImageItemData(itemData)) {
        if (itemData.storageLink) {
          mediaStorageIds.push(itemData.storageLink.split("/").pop()!);
        }
      } else if (
        (isVideoItemData(itemData) && itemData.isStorageUrl) ||
        (isAudioItemData(itemData) && itemData.isStorageUrl)
      ) {
        if (itemData.url) {
          mediaStorageIds.push(itemData.url.split("/").pop()!);
        }
      }
      const newItemId = newItemIdMap[itemId];
      const { translateX, translateY } = itemData.transformation || {
        translateX: 0,
        translateY: 0,
      };
      if (isConnectorData(itemData)) {
        if (itemData.startPoint.pointType === "Board") {
          itemData.startPoint.x += -minX + x;
          itemData.startPoint.y += -minY + y;
        }
        if (itemData.endPoint.pointType === "Board") {
          itemData.endPoint.x += -minX + x;
          itemData.endPoint.y += -minY + y;
        }
        if (itemData.middlePoint?.pointType === "Board") {
          itemData.middlePoint.x += -minX + x;
          itemData.middlePoint.y += -minY + y;
        }
      } else if (itemData.transformation && !childItemIds.has(itemId)) {
        const newTx = translateX - minX + x;
        const newTy = translateY - minY + y;
        itemData.transformation.translateX = newTx;
        itemData.transformation.translateY = newTy;
        // Sticker/Shape/Frame embed a RichText whose transformation is the SAME
        // object in memory but serialized separately. When deserializing, text.deserialize
        // overwrites the shared transformation back to the original coords unless we
        // update text.transformation here too.
        const d = itemData as Record<string, unknown>;
        if (d.text && typeof d.text === "object") {
          const textData = d.text as Record<string, unknown>;
          if (textData.transformation && typeof textData.transformation === "object") {
            const tt = textData.transformation as Record<string, number>;
            tt.translateX = newTx;
            tt.translateY = newTy;
          }
        }
      } else if (childItemIds.has(itemId)) {
        // Children have LOCAL coords relative to their parent container.
        // applyAddChildren (called by handleNesting) expects WORLD coords and
        // converts them to local via toLocalOf(). So we need to give children
        // their new world position = parent.newWorld + childLocal.
        const parentId = childToParent.get(itemId);
        const parentOrig = parentId ? originalTranslations.get(parentId) : undefined;
        const parentOrigTx = parentOrig?.tx ?? 0;
        const parentOrigTy = parentOrig?.ty ?? 0;
        const parentNewTx = parentOrigTx - minX + x;
        const parentNewTy = parentOrigTy - minY + y;
        const newChildTx = parentNewTx + translateX;
        const newChildTy = parentNewTy + translateY;
        if (itemData.transformation) {
          itemData.transformation.translateX = newChildTx;
          itemData.transformation.translateY = newChildTy;
          const d2 = itemData as Record<string, unknown>;
          if (d2.text && typeof d2.text === "object") {
            const textData = d2.text as Record<string, unknown>;
            if (textData.transformation && typeof textData.transformation === "object") {
              const tt = textData.transformation as Record<string, number>;
              tt.translateX = newChildTx;
              tt.translateY = newChildTy;
            }
          }
        }
      }
      if (
        itemData.itemType !== "RichText" &&
        "childIds" in itemData &&
        (itemData as Extract<ItemData, { childIds?: string[] }>).childIds?.length
      ) {
        const itemDataWithChildren = itemData as Extract<ItemData, { childIds: string[] }>;
        itemDataWithChildren.childIds = itemDataWithChildren.childIds.map(
          (childId: string) => newItemIdMap[childId] || childId
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
    const voidComments = this.items.listAll().filter((item) => {
      const comment = item as Comment;
      return item.itemType === "Comment" && !comment.getThread().length;
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
    if (!parentItem || parentItem.itemType !== "AINode") {
      return [];
    }
    const parentAINode = parentItem as AINode;
    return [parentAINode, ...this.getParentAINodes(parentAINode)];
  }

  setIsBoardMenuOpen(isOpen: boolean): void {
    this.isBoardMenuOpen = isOpen;
  }

  getIsBoardMenuOpen(): boolean {
    return this.isBoardMenuOpen;
  }

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

      if (isConnectorData(itemData)) {
        replaceConnectorHeadItemId(itemData.startPoint);
        replaceConnectorHeadItemId(itemData.endPoint);
      }
    }

    const newMap: { [key: string]: ItemData } = {};

    // Collect child IDs from container items (same logic as paste()).
    const dupChildItemIds = new Set<string>();
    const dupChildToParent = new Map<string, string>();
    for (const itemId in itemsMap) {
      const d = itemsMap[itemId] as Record<string, unknown>;
      if (Array.isArray(d.childIds)) {
        for (const cid of d.childIds as string[]) {
          dupChildItemIds.add(cid);
          dupChildToParent.set(cid, itemId);
        }
      }
    }

    // iterate over itemsMap to find the minimal translation (top-level only)
    let minX = Infinity;
    let minY = Infinity;

    for (const itemId in itemsMap) {
      if (dupChildItemIds.has(itemId)) continue;
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

    // Snapshot originals before the mutation loop (same reason as in paste()).
    const dupOriginalTranslations = new Map<string, { tx: number; ty: number }>();
    for (const itemId in itemsMap) {
      const t = itemsMap[itemId].transformation;
      dupOriginalTranslations.set(itemId, { tx: t?.translateX ?? 0, ty: t?.translateY ?? 0 });
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
      if (isConnectorData(itemData)) {
        if (itemData.startPoint.pointType === "Board") {
          itemData.startPoint.x += -minX + right + width;
          itemData.startPoint.y += -minY + top;
        }
        if (itemData.endPoint.pointType === "Board") {
          itemData.endPoint.x += -minX + right + width;
          itemData.endPoint.y += -minY + top;
        }

        if (itemData.middlePoint?.pointType === "Board") {
          itemData.middlePoint.x += -minX + right + width;
          itemData.middlePoint.y += -minY + top;
        }
      } else if (dupChildItemIds.has(itemId)) {
        // Child: convert local coords to world so handleNesting + applyAddChildren
        // can re-nest it with the correct local transform.
        const parentId = dupChildToParent.get(itemId);
        const parentOrig = parentId ? dupOriginalTranslations.get(parentId) : undefined;
        const parentOrigTx = parentOrig?.tx ?? 0;
        const parentOrigTy = parentOrig?.ty ?? 0;
        const parentNewTx = parentOrigTx - minX + right + width;
        const parentNewTy = parentOrigTy - minY + top;
        if (itemData.transformation) {
          const newChildTx = parentNewTx + translateX;
          const newChildTy = parentNewTy + translateY;
          itemData.transformation.translateX = newChildTx;
          itemData.transformation.translateY = newChildTy;
          itemData.transformation.isLocked = false;
          const d2 = itemData as Record<string, unknown>;
          if (d2.text && typeof d2.text === "object") {
            const tt = ((d2.text as Record<string, unknown>).transformation as Record<string, number> | undefined);
            if (tt) { tt.translateX = newChildTx; tt.translateY = newChildTy; }
          }
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

        const d2 = itemData as Record<string, unknown>;
        if (d2.text && typeof d2.text === "object") {
          const tt = ((d2.text as Record<string, unknown>).transformation as Record<string, number> | undefined);
          if (tt) {
            tt.translateX = itemData.transformation.translateX;
            tt.translateY = itemData.transformation.translateY;
          }
        }
      }
      const itemDataWithChildren = itemData as { childIds?: string[]; children?: string[] };
      if ("childIds" in itemDataWithChildren && itemDataWithChildren.childIds?.length) {
        itemDataWithChildren.childIds = itemDataWithChildren.childIds.map(
          (childId: string) => newItemIdMap[childId] || childId
        );
      } else if ("children" in itemDataWithChildren && itemDataWithChildren.children?.length) {
        // legacy support
        itemDataWithChildren.children = itemDataWithChildren.children.map(
          (childId: string) => newItemIdMap[childId] || childId
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
        if ("zIndex" in (dataA as object) && "zIndex" in (dataB as object)) {
          return (dataA as Record<string, number>).zIndex - (dataB as Record<string, number>).zIndex;
        }
        return 0;
      }
    );

    const pasteItem = (itemId: string, data: ItemData): void => {
      if (!data) {
        throw new Error("Pasting itemId doesn't exist in itemsMap");
      }

      // Create item first to get its type
      const item = this.createItem(itemId, data);

      if (isAINodeData(data) && item.itemType === "AINode") {
        data.text = (item as AINode).text.serialize();
      }

      if (isFrameData(data) && item.itemType === "Frame" && data.text) {
        data.text.placeholderText = `Frame ${this.getMaxFrameSerial() + 1}`;
      }

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
      .listGroupItems()
      .map((frame) =>
        frame.getRichText()?.getTextString().length === 0
          ? frame.getRichText()?.placeholderText || ""
          : frame.getRichText()?.getTextString() || ""
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

  private gravity: GravityEngine | null = null;

  enableGravity(): void {
    if (this.gravity) return;
    this.gravity = new GravityEngine(this);
    this.gravity.start();
  }

  disableGravity(): void {
    if (!this.gravity) return;
    this.gravity.stop();
    this.gravity = null;
  }

  isGravityEnabled(): boolean {
    return this.gravity !== null;
  }

  syncGravity(): void { this.gravity?.flushSync(); }
  wakeGravity(): void { this.gravity?.wake(); }

  // ── Force-directed graph layout ───────────────────────────────────────────

  private forceGraph: ForceGraphEngine | null = null;

  /** Enable force-directed layout for the connected component containing `nodeId`. */
  enableForceGraph(nodeId: string): void {
    if (!this.forceGraph) {
      this.forceGraph = new ForceGraphEngine(this);
    }
    this.forceGraph.enableForGraph(nodeId);
  }

  /** Disable graph mode for the component containing `nodeId`. */
  disableForceGraph(nodeId: string): void {
    if (!this.forceGraph) return;
    this.forceGraph.disableForGraph(nodeId);
    if (!this.forceGraph.hasActiveComponents()) {
      this.forceGraph = null;
    }
  }

  /** Returns true if `nodeId` is currently in an active force-directed component. */
  isNodeInForceGraph(nodeId: string): boolean {
    return this.forceGraph?.isNodeInActiveGraph(nodeId) ?? false;
  }

  /** Get the connector target gap (px) for the component containing `nodeId`. */
  getForceGraphGap(nodeId: string): number | undefined {
    return this.forceGraph?.getComponentTargetGap(nodeId);
  }

  /** Set the connector target gap (px) for the component containing `nodeId`. */
  setForceGraphGap(nodeId: string, gap: number): void {
    this.forceGraph?.setComponentTargetGap(nodeId, gap);
  }

  /**
   * Returns IDs of all items currently being dragged (both selected and unselected drag).
   * Used by physics engines to skip items that are under user control.
   */
  getDraggedItemIds(): Set<string> {
    const ids = new Set<string>();
    const selectTool = this.tools.getSelect();
    // Case 1: dragging selected items — transformationRenderBlock is true
    if (this.selection.transformationRenderBlock) {
      for (const item of this.selection.list()) ids.add(item.getId());
    }
    // Case 2: dragging an unselected item — transformationRenderBlock is NOT set,
    // selection.list() is empty (removeAll() called), item is in downOnItem
    if (selectTool?.isDraggingUnselectedItem && selectTool.downOnItem) {
      ids.add(selectTool.downOnItem.getId());
    }
    return ids;
  }

  /** Flush pending physics positions to the server immediately (call before drag starts). */
  syncForceGraph(): void {
    this.forceGraph?.flushSync();
  }

  /** Call after dragging a node to re-wake the physics engine if it was sleeping. */
  wakeForceGraph(): void {
    this.forceGraph?.wake();
  }
}

export interface BoardSnapshot {
  items: (ItemData & { id: string })[];
  events: SyncBoardEvent[];
  lastIndex: number;
}
