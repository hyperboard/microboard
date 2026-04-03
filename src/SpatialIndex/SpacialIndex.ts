import {DocumentFactory} from 'api/DocumentFactory';
import {ItemsIndexRecord} from 'BoardOperations';
import {Camera} from 'Camera';
import {translateElementBy, positionRelatively} from "HTMLAdapter/Utils";
import type { Item, ItemData } from "Items/Item";
import type { Frame } from "Items/Frame/Frame";
import { Mbr } from "Geometry/Mbr/Mbr";
import { Point } from "Geometry/Point/Point";
import type { Connector } from "Items/Connector/Connector";
import type { Comment } from "Items/Comment/Comment";
import type { Shape } from "Items/Shape/Shape";
import type { Drawing } from "Items/Drawing/Drawing";
import type { FrameType } from "Items/Frame/Basic";
import {DrawingContext} from 'Geometry/DrawingContext';
import {Pointer} from 'Pointer';
import {conf} from 'Settings';
import {Subject} from 'Subject';
import {LayeredIndex} from './LayeredIndex';
import {BaseItem, SerializedItemData} from "../Items/BaseItem";
import {ItemDataWithId} from "../Items/Item";
import { renderItemToHTML } from "HTMLAdapter/Renderers";

/**
 * Transforms a world-space axis-aligned bounding box into the local coordinate space
 * of a container item.  Handles rotation/shear by projecting all four corners through
 * the inverse of the container's world matrix and returning their AABB.
 */
function worldBoundsToLocal(
  container: BaseItem,
  left: number, top: number, right: number, bottom: number,
): { left: number; top: number; right: number; bottom: number } {
  const inv = container.getNestingMatrix().getInverse();
  const corners = [
    new Point(left,  top),
    new Point(right, top),
    new Point(right, bottom),
    new Point(left,  bottom),
  ];
  for (const c of corners) inv.apply(c);
  return {
    left:   Math.min(corners[0].x, corners[1].x, corners[2].x, corners[3].x),
    top:    Math.min(corners[0].y, corners[1].y, corners[2].y, corners[3].y),
    right:  Math.max(corners[0].x, corners[1].x, corners[2].x, corners[3].x),
    bottom: Math.max(corners[0].y, corners[1].y, corners[2].y, corners[3].y),
  };
}

export function coerceMbr(
  left: number | Mbr | { left: number; top: number; right: number; bottom: number },
  top?: number,
  right?: number,
  bottom?: number
): Mbr {
  if (left instanceof Mbr) return left;
  if (typeof left === "object" && left !== null) return new Mbr(left.left, left.top, left.right, left.bottom);
  return new Mbr(left as number, top!, right!, bottom!);
}

export interface ISpatialIndex {
  change(item: Item): void;
  listAll(): Item[];
  listUnderPoint(point: Point | { x: number; y: number }, tolerance?: number): Item[];
  listEnclosedOrCrossedBy(rect: Mbr | { left: number; top: number; right: number; bottom: number } | number, top?: number, right?: number, bottom?: number): Item[];
  listEnclosedBy(rect: Mbr | { left: number; top: number; right: number; bottom: number } | number, top?: number, right?: number, bottom?: number): Item[];
  getZIndex(item: Item): number;
  moveToZIndex(item: Item, zIndex: number): void;
  getById(id: string): Item | undefined;
  findById(id: string): Item | undefined;
  insert(item: Item): void;
  remove(item: Item, preserveChildren?: boolean): void;
  change(item: Item): void;
  clear(): void;
  getMbr(): Mbr;
  listRectsEnclosedOrCrossedBy(rect: Mbr | { left: number; top: number; right: number; bottom: number } | number, top?: number, right?: number, bottom?: number): Mbr[];
  listNearestTo(point: Point, maxItems: number, filter: (item: Item) => boolean, maxDistance: number): Item[];
  getByZIndex(index: number): Item;
  getLastZIndex(): number;
  copy(): ItemDataWithId[];
}

export class SpatialIndex implements ISpatialIndex {
  subject = new Subject<Items>();
  private itemsArray: Item[] = [];
  private itemsIndex = new LayeredIndex((item: Item): number => {
    return this.itemsArray.indexOf(item);
  });
  private Mbr = new Mbr();
  readonly items: Items;

  constructor(view: Camera, pointer: Pointer) {
    this.items = new Items(this, view, pointer, this.subject);
  }

  clear(): void {
    this.itemsArray = [];
    this.itemsIndex = new LayeredIndex((item: Item): number => {
      return this.itemsArray.indexOf(item);
    });
    this.Mbr = new Mbr();
  }

  insert(item: Item): void {
    if (this.itemsArray.includes(item) || this.getById(item.getId())) {
      return;
    }
    this.itemsArray.push(item);
    this.itemsIndex.insert(item);

    if (conf.isNode()) {
      return;
    }

    if (this.Mbr.getWidth() === 0 && this.Mbr.getHeight() === 0) {
      this.Mbr = item.getMbr().copy();
    } else {
      this.Mbr.combine([item.getMbr()]);
    }
    item.subject.subscribe(this.change);
    this.subject.publish(this.items);
  }

  change = (item: Item): void => {
    this.itemsIndex.change(item);
    if (this.itemsArray.length === 0) {
      this.Mbr = new Mbr();
    } else {
      this.Mbr = this.itemsArray[0].getMbrWithChildren().copy();
      for (let i = 1; i < this.itemsArray.length; i++) {
        this.Mbr.combine([this.itemsArray[i].getMbrWithChildren()]);
      }
    }
    this.subject.publish(this.items);
  };

  remove(item: Item, preserveChildren = false): void {
    const baseItem = item as BaseItem;
    if (!preserveChildren && baseItem.index) {
      baseItem.removeChildItems(baseItem.index.listAll());
    }
    this.itemsArray.splice(this.itemsArray.indexOf(item), 1);
    this.itemsIndex.remove(item);

    if (item.parent !== 'Board') {
      // Item is inside a container — also remove it from the container's index
      const parentFrame = this.items.getById(item.parent);
      if (parentFrame) {
        parentFrame.removeChildItems(item);
      }
      this.subject.publish(this.items);
      return;
    }

    if (this.itemsArray.length === 0) {
      this.Mbr = new Mbr();
    } else {
      this.Mbr = this.itemsArray[0].getMbrWithChildren().copy();
      for (let i = 1; i < this.itemsArray.length; i++) {
        this.Mbr.combine([this.itemsArray[i].getMbrWithChildren()]);
      }
    }

    this.subject.publish(this.items);
  }

  copy(): ItemDataWithId[] {
    return this.getItemsWithIncludedChildren(this.itemsArray).map(item => {
      const serialized = { ...item.serialize(), id: item.getId() };
      // Nested items store local transforms internally. For serialization we always
      // write world transforms so that old and new clients can load the data correctly.
      // applyAddChildren will convert back to local on load.
      if (item.parent !== "Board" && (item as BaseItem).getWorldMatrix) {
        const worldMatrix = (item as BaseItem).getWorldMatrix();
        serialized.transformation = {
          ...serialized.transformation,
          translateX: worldMatrix.translateX,
          translateY: worldMatrix.translateY,
          scaleX: worldMatrix.scaleX,
          scaleY: worldMatrix.scaleY,
          isLocked: false,
        } as SerializedItemData["transformation"];
      }
      return serialized;
    });
  }

  getItemsWithIncludedChildren(items: Item[]): Item[] {
    return items.flatMap(item => {
      const baseItem = item as BaseItem;
      if (baseItem.index) {
        return [item, ...this.getItemsWithIncludedChildren(baseItem.index.listAll())];
      }
      return item;
    });
  }

  getItemChildren(item: Item): Item[] {
    if ("index" in item && item.index) {
      return item.index.listAll();
    }
    return [];
  }

  getItemParent(item: Item): Item | undefined {
    if (item.parent === "Board") {
      return;
    }
    return this.getById(item.parent);
  }

  moveToZIndex(item: Item, zIndex: number): void {
    if (item.parent !== "Board") {
      this.getById(item.parent)?.index?.moveToZIndex(item, zIndex);
      this.subject.publish(this.items);
      return;
    }
    const index = this.itemsArray.indexOf(item);
    this.itemsArray.splice(index, 1);
    this.itemsArray.splice(zIndex, 0, item);
    this.change(item);
    this.subject.publish(this.items);
  }

  moveManyToZIndex(itemsRecord: ItemsIndexRecord): void {
    const items = Object.keys(itemsRecord)
      .map(id => this.items.getById(id))
      .filter(item => item !== undefined);
    const zIndex = Object.values(itemsRecord);

    for (let i = 0; i < zIndex.length; i++) {
      const index = zIndex[i];
      this.itemsArray[index] = items[i];
    }

    this.itemsArray.forEach(this.change.bind(this));
  }

  sendToBack(item: Item, shouldPublish = true): void {
    if (item.parent !== "Board") {
      const parent = this.getById(item.parent);
      if (parent?.index) {
        parent.index.sendToBack(item);
      }
      if (shouldPublish) {
        this.subject.publish(this.items);
      }
      return;
    }
    const index = this.itemsArray.indexOf(item);
    this.itemsArray.splice(index, 1);
    this.itemsArray.unshift(item);
    this.itemsIndex.change(item);
    if (shouldPublish) {
      this.subject.publish(this.items);
    }
  }

  sendManyToBack(items: Item[]): void {
    const groups = this.splitItemsToGroups(items);
    Object.entries(groups).forEach(([key, value]) => {
      if (key !== "Board") {
        this.getById(key)?.index?.sendManyToBack(value);
      }
    })
    if (groups["Board"]) {
      const newItems: Item[] = [...groups["Board"]];
      this.itemsArray.forEach(item => {
        if (!groups["Board"].includes(item)) {
          newItems.push(item);
        }
      });
      this.itemsArray = newItems;
      this.itemsArray.forEach(this.change.bind(this));
    }
  }

  bringToFront(item: Item, shouldPublish = true): void {
    if (item.parent !== "Board") {
      this.getById(item.parent)?.index?.bringToFront(item);
      if (shouldPublish) {
        this.subject.publish(this.items);
      }
      return;
    }
    const index = this.itemsArray.indexOf(item);
    this.itemsArray.splice(index, 1);
    this.itemsArray.push(item);
    this.itemsIndex.change(item);
    if (shouldPublish) {
      this.subject.publish(this.items);
    }
  }

  bringManyToFront(items: Item[]): void {
    const groups = this.splitItemsToGroups(items);
    Object.entries(groups).forEach(([key, value]) => {
      if (key !== "Board") {
        this.getById(key)?.index?.bringManyToFront(value);
      }
    })
    if (groups["Board"]) {
      const newItems: Item[] = [];
      this.itemsArray.forEach(item => {
        if (!groups["Board"].includes(item)) {
          newItems.push(item);
        }
      });
      newItems.push(...groups["Board"]);
      this.itemsArray = newItems;
      this.itemsArray.forEach(this.change.bind(this));
    }
  }

  private splitItemsToGroups(items: Item[]): Record<string, Item[]> {
    const groups: Record<string, Item[]> = {};
    for (const item of items) {
      if (!groups[item.parent]) {
        groups[item.parent] = [item];
      } else {
        groups[item.parent].push(item);
      }
    }
    return groups;
  }

  // TODO Item could be frame
  moveSecondAfterFirst(first: Item, second: Item): void {
    if (first.parent !== "Board" && second.parent === first.parent) {
      this.getById(first.parent)?.index?.moveSecondAfterFirst(first, second);
      this.subject.publish(this.items);
      return;
    }
    const secondIndex = this.itemsArray.indexOf(second);
    this.itemsArray.splice(secondIndex, 1);
    const firstIndex = this.itemsArray.indexOf(first);
    this.itemsArray.splice(firstIndex + 1, 0, second);
    this.change(first);
    this.change(second);
    this.subject.publish(this.items);
  }

  // TODO Item could be frame
  moveSecondBeforeFirst(first: Item, second: Item): void {
    if (first.parent !== "Board" && second.parent === first.parent) {
      this.getById(first.parent)?.index?.moveSecondBeforeFirst(first, second);
      this.subject.publish(this.items);
      return;
    }
    const secondIndex = this.itemsArray.indexOf(second);
    this.itemsArray.splice(secondIndex, 1);
    const firstIndex = this.itemsArray.indexOf(first);
    this.itemsArray.splice(firstIndex, 0, second);
    this.change(first);
    this.change(second);
    this.subject.publish(this.items);
  }

  getById(id: string): BaseItem | undefined {
    const item = this.getItemsWithIncludedChildren(this.itemsArray).find(item => item.getId() === id);
    if (item) {
      return item as BaseItem;
    }
  }

  findById(id: string): Item | undefined {
    return this.getById(id); // Reuse `getById` for consistency
  }

  listEnclosedBy(
    left: number | Mbr | { left: number; top: number; right: number; bottom: number },
    top?: number,
    right?: number,
    bottom?: number
  ): Item[] {
    const mbr = coerceMbr(left, top, right, bottom);
    const items = this.itemsIndex.listEnclosedBy(mbr);
    const children: Item[] = [];
    const clearItems = items.filter((item: Item) => {
      if ("index" in item && item.index) {
        const local = worldBoundsToLocal(item as BaseItem, mbr.left, mbr.top, mbr.right, mbr.bottom);
        children.push(...item.index.listEnclosedBy(local.left, local.top, local.right, local.bottom));
        if (!item.getMbr().isEnclosedBy(mbr)) {
          return false;
        }
      }
      return true;
    })
    return [...clearItems, ...children];
  }

  listEnclosedOrCrossedBy(
    left: number | Mbr | { left: number; top: number; right: number; bottom: number },
    top?: number,
    right?: number,
    bottom?: number
  ): Item[] {
    const mbr = coerceMbr(left, top, right, bottom);
    const items = this.itemsIndex.listEnclosedOrCrossedBy(mbr);
    const children: Item[] = [];
    const clearItems = items.filter((item: Item) => {
      if ("index" in item && item.index) {
        const local = worldBoundsToLocal(item as BaseItem, mbr.left, mbr.top, mbr.right, mbr.bottom);
        children.push(...item.index.listEnclosedOrCrossedBy(local.left, local.top, local.right, local.bottom));
        if (!item.getMbr().isEnclosedOrCrossedBy(mbr)) {
          return false;
        }
      }
      return true;
    })
    return [...clearItems, ...children];
  }

  listRectsEnclosedOrCrossedBy(
    left: number | Mbr | { left: number; top: number; right: number; bottom: number },
    top?: number,
    right?: number,
    bottom?: number
  ): Mbr[] {
    return this.listEnclosedOrCrossedBy(left, top, right, bottom).map(item => item.getMbr());
  }

  listUnderPoint(point: Point, tolerance = 5): Item[] {
    const items = this.itemsIndex.listUnderPoint(point, tolerance);
    const children: Item[] = [];
    const clearItems = items.filter((item: Item) => {
      if ("index" in item && item.index) {
        // Transform the world-space point into the container's nested coordinate space.
        const localPt = new Point(point.x, point.y);
        (item as BaseItem).getNestingMatrix().getInverse().apply(localPt);
        children.push(...item.index.listUnderPoint(localPt, tolerance));
        if (!item.getMbr().isUnderPoint(point)) {
          return false;
        }
      }
      if ("index" in item && item.index) {
        return false;
      }
      return true;
    })
    return [...clearItems, ...children];
  }

  listNearestTo(
    point: Point,
    maxItems: number,
    filter: (item: Item) => boolean,
    maxDistance: number
  ): Item[] {
    return this.itemsIndex.listNearestTo(point, maxItems, filter, maxDistance);
  }

  getComments(): Comment[] {
    return this.itemsArray.filter(item => item.shouldFollowItems()) as Comment[];
  }

  getMbr(): Mbr {
    // const mbr = new Mbr()
    // const allItems = [...this.itemsArray, ...this.framesArray]
    // allItems.forEach(item => mbr.combine([item.getMbr()]))
    // return mbr
    return this.Mbr;
  }

  getNearestTo(
    point: Point,
    maxItems: number,
    filter: (item: Item) => boolean,
    maxDistance: number
  ): Item[] {
    const items = this.getItemsWithIncludedChildren(this.itemsArray);
    const filteredItems = filter ? items.filter(filter) : items;

    const itemsWithDistance = filteredItems.map(item => ({
      item,
      distance: item.getMbr().getDistanceToPoint(point)
    }));

    const inRange = itemsWithDistance.filter(x => x.distance <= maxDistance);

    return inRange
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxItems)
      .map(x => x.item);
  }

  listAll(): Item[] {
    return this.getItemsWithIncludedChildren(this.itemsArray).concat();
  }

  getZIndex(item: Item): number {
    const index = this.itemsArray.indexOf(item);
    if (index === -1) {
      return this.getLastZIndex();
    }
    return index;
  }

  getLastZIndex(): number {
    return this.itemsArray.length - 1;
  }

  getByZIndex(index: number): Item {
    if (index < this.itemsArray.length) {
      return this.itemsArray[index];
    } else {
      const lastIndex = this.getLastZIndex();
      return this.itemsArray[lastIndex];
    }
  }
}

export class Items {
  constructor(
    public index: ISpatialIndex,
    private view: Camera,
    private pointer: Pointer,
    readonly subject: Subject<Items>
  ) {
  }

  update(item: Item): void {
    this.index.change(item);
  }

  listAll(): Item[] {
    return this.index.listAll();
  }

  listUnderPoint(point: Point, tolerance = 5): Item[] {
    return this.index.listUnderPoint(point, tolerance);
  }

  listEnclosedBy(
    left: number | Mbr | { left: number; top: number; right: number; bottom: number },
    top?: number,
    right?: number,
    bottom?: number
  ): Item[] {
    return this.index.listEnclosedBy(left, top, right, bottom);
  }

  listEnclosedOrCrossedBy(
    left: number | Mbr | { left: number; top: number; right: number; bottom: number },
    top?: number,
    right?: number,
    bottom?: number
  ): Item[] {
    return this.index.listEnclosedOrCrossedBy(left, top, right, bottom);
  }

  listGroupItems(): BaseItem[] {
    return this.index.listAll().filter(item => "index" in item && item.index) as BaseItem[];
  }

  getById(id: string): BaseItem | undefined {
    return this.index.getById(id) as BaseItem | undefined;
  }

  findById(id: string): Item | undefined {
    return this.index.findById(id);
  }

  getEnclosed(left: number, top: number, right: number, bottom: number): Item[] {
    return this.index.listEnclosedBy(left, top, right, bottom);
  }

  getEnclosedOrCrossed(left: number, top: number, right: number, bottom: number): Item[] {
    return this.index.listEnclosedOrCrossedBy(left, top, right, bottom);
  }

  getGroupItemsEnclosedOrCrossed(left: number, top: number, right: number, bottom: number): BaseItem[] {
    return this.index.listEnclosedOrCrossedBy(left, top, right, bottom).filter(item => "index" in item && item.index) as BaseItem[];
  }

  getUnderPoint(point: Point, tolerance = 5): Item[] {
    return this.index.listUnderPoint(point, tolerance);
  }

  getMbr(): Mbr {
    return this.index.getMbr();
  }

  getFilteredMbr(): Mbr {
    const MAX_ITEM_SIZE = 1_000_000;
    const items = this.listAll();
    let mbr: Mbr | null = null;
    for (const item of items) {
      const itemMbr = item.getMbr();
      if (itemMbr.getWidth() < MAX_ITEM_SIZE && itemMbr.getHeight() < MAX_ITEM_SIZE) {
        if (mbr === null) {
          mbr = itemMbr.copy();
        } else {
          mbr.combine([itemMbr]);
        }
      }
    }
    return mbr ?? this.getMbr();
  }

  getInView(): Item[] {
    const {left, top, right, bottom} = this.view.getMbr();
    return this.index.listEnclosedOrCrossedBy(left, top, right, bottom);
  }

  getItemsInView(): Item[] {
    const {left, top, right, bottom} = this.view.getMbr();
    return this.index.listEnclosedOrCrossedBy(left, top, right, bottom);
  }

  getGroupItemsInView(): BaseItem[] {
    const {left, top, right, bottom} = this.view.getMbr();
    return this.getGroupItemsEnclosedOrCrossed(left, top, right, bottom);
  }

  getComments(): Comment[] {
    return this.listAll().filter((item): item is Comment => item.shouldFollowItems());
  }

  getUnderPointer(size = 0): Item[] {
    const {x, y} = this.pointer.point;
    const unmodifiedSize = size;
    size = 16;
    const tolerated = this.index.listEnclosedOrCrossedBy(x - size, y - size, x + size, y + size);

    let enclosed = tolerated.some(item => !item.isAlignmentSource())
      ? tolerated
      : this.index.listEnclosedOrCrossedBy(x, y, x, y);

    const underPointer = this.getUnderPoint(new Point(x, y), size);
    if (enclosed.length === 0) {
      enclosed = underPointer;
    }

    if (underPointer.some(item => item.itemType === "Drawing")) {
      enclosed = [...underPointer, ...enclosed];
    }

    const {nearest} = enclosed.reduce(
      (acc: { nearest?: Item; area: number }, item: Item) => {
        const area = item.getMbr().getHeight() * item.getMbr().getWidth();

        if (item.itemType === "Drawing" && !(item as any).isPointNearLine(this.pointer.point)) {
          return acc;
        }

        const color = item.itemType === "Shape" ? (item as Shape).getBackgroundColor() : null;
        const isItemTransparent =
          color?.type === 'fixed' && color.value === 'none';
        const itemZIndex = this.getZIndex(item);
        const accZIndex = this.getZIndex(acc.nearest!);

        if (
          (itemZIndex > accZIndex && (!isItemTransparent || area === acc.area)) ||
          area < acc.area
        ) {
          return {nearest: item, area};
        }

        return acc;
      },
      {nearest: undefined, area: Infinity} as {
        nearest?: Item;
        area: number;
      }
    );

    if (nearest) {
      return [nearest];
    }

    return [];
  }

  getNearPointer(
    maxDistance = 100,
    maxItems = 10,
    filter: (item: Item) => boolean = () => true
  ): Item[] {
    return this.index.listNearestTo(this.pointer.point, maxItems, filter, maxDistance);
  }

  getZIndex(item: Item): number {
    return this.index.getZIndex(item);
  }

  getByZIndex(index: number): Item {
    return this.index.getByZIndex(index);
  }

  getLastZIndex(): number {
    return this.index.getLastZIndex();
  }

  getLinkedConnectorsById(id: string): Connector[] {
    return this.listAll().filter(item => {
      if (item.isAlignmentSource()) {
        return false;
      }

      const {startItem, endItem} = (item as Connector).getConnectedItems();
      if (startItem?.getId() === id || endItem?.getId() === id) {
        return true;
      }

      return false;
    }) as Connector[];
  }

  getConnectorsByItemIds(startPointerItemId?: string, endPointerItemId?: string): Connector[] {
    if (!startPointerItemId && !endPointerItemId) {
      return [];
    }
    return this.listAll().filter(item => {
      if (item.isAlignmentSource() || !(item as Connector).isConnected()) {
        return false;
      }
      const {startItem, endItem} = (item as Connector).getConnectedItems();
      if (startPointerItemId && endPointerItemId) {
        if (
          startPointerItemId &&
          startItem &&
          startItem.getId() === startPointerItemId &&
          endPointerItemId &&
          endItem &&
          endItem.getId() === endPointerItemId
        ) {
          return true;
        }
        return false;
      }
      if (startPointerItemId && startItem && startItem.getId() === startPointerItemId) {
        return true;
      }
      if (endPointerItemId && endItem && endItem.getId() === endPointerItemId) {
        return true;
      }
      return false;
    }) as Connector[];
  }

  setFrameType(frameType: FrameType): void {
    // const frames = this.items.getIdsByItemTypes(["Frame"]);
    // if (frames.length) {
    // this.emit({
    //   class: "Frame",
    //   method: "setFrameType",
    //   item: frames,
    //   frameType
    // });
    // }
    const items = this.listAll();
    items.forEach((item) => {
      if (item.itemType === "Frame") {
        (item as Frame).setFrameType(frameType);
      }
    });
  }

  getFrameType(): FrameType {
    const items = this.listAll();
    const frame = items.find(item => item.itemType === "Frame");
    return frame ? (frame as Frame).getFrameType() : "Custom";
  }

  render(context: DrawingContext): void {
    const items = this.getItemsInView();

    items.forEach(item => {
      if (item.parent === "Board") {
        item.render(context);
      }
    })

    items.forEach(item => {
      item.renderHoverHighlight(context);
    });
    // frames.forEach(frame => {
    // 	frame.renderPath(context);
    // 	frame
    // 		.getChildrenIds()
    // 		.map(id => this.getById(id))
    // 		.forEach(child => {
    // 			if (child) {
    // 				frameChildrenIds.push(child.getId());
    // 				child.render(context);
    // 			}
    // 		});
    // }); // background of frames
    // rest.filter(item => !frameChildrenIds.includes(item.getId())).forEach(item =>
    // 	item.render(context)
    // ); // non-frame items
    // frames.forEach(frame => frame.renderBorders(context)); // borders of frames
    // frames.forEach(frame => frame.renderName(context)); // names of frames
  }

  renderHTML(documentFactory: DocumentFactory): string {
    const items = this.getItemsInView();
    return this.getHTML(documentFactory, items);
  }

  getWholeHTML(documentFactory: DocumentFactory): string {
    const items = this.listAll();
    return this.getHTML(documentFactory, items);
  }

  getHTML(documentFactory: DocumentFactory, items: Item[]): string {
    const lowestCoordinates = items
      .map(item => item.getMbr())
      .reduce(
        (acc, mbr) => ({
          left: Math.min(acc.left, mbr.left),
          top: Math.min(acc.top, mbr.top),
        }),
        {left: 0, top: 0}
      );

    const groups: BaseItem[] = []
    const rest: Item[] = []

    items.forEach(item => {
      if ("index" in item && item.index) {
        groups.push(item as BaseItem)
      } else {
        rest.push(item)
      }
    })

    const childrenMap = new Map<string, string>();
    const GroupsHTML = groups.map(group => {
      group.getChildrenIds()?.forEach(childId => childrenMap.set(childId, group.getId()));

      const html = renderItemToHTML(group, documentFactory);
      translateElementBy(html, -lowestCoordinates.left, -lowestCoordinates.top);

      return html;
    });
    const restHTML = rest
      .map(item => renderItemToHTML(item as BaseItem, documentFactory))
      .filter(item => !!item)
      .map(item => {
        if (item.tagName.toLowerCase() === 'connector-item') {
          const startX = parseFloat(item.getAttribute('data-start-point-x') || '0');
          const startY = parseFloat(item.getAttribute('data-start-point-y') || '0');
          const endX = parseFloat(item.getAttribute('data-end-point-x') || '0');
          const endY = parseFloat(item.getAttribute('data-end-point-y') || '0');

          item.setAttribute(
            'data-start-point-x',
            (startX - lowestCoordinates.left).toString()
          );
          item.setAttribute(
            'data-start-point-y',
            (startY - lowestCoordinates.top).toString()
          );
          item.setAttribute(
            'data-end-point-x',
            (endX - lowestCoordinates.left).toString()
          );
          item.setAttribute(
            'data-end-point-y',
            (endY - lowestCoordinates.top).toString()
          );
        }
        if (!childrenMap.get(item.id)) {
          return translateElementBy(item, -lowestCoordinates.left, -lowestCoordinates.top);
        }
        return item;
      });

    for (const item of restHTML) {
      const parentFrameId = childrenMap.get(item.id);
      const group = GroupsHTML.find(
        el => parentFrameId !== undefined && el.id === parentFrameId
      );
      if (group) {
        positionRelatively(item, group);
        group.appendChild(item);
      }
    }

    let result = '';
    for (const group of GroupsHTML) {
      result += group.outerHTML;
    }
    for (const item of restHTML) {
      if (!childrenMap.get(item.id)) {
        result += item.outerHTML;
      }
    }
    return result;
  }
}
