import {Subject} from "../Subject";
import {DrawingContext} from "../Items/DrawingContext";
import {Item, ItemDataWithId} from "../Items/Item";
import {Point} from "../Items/Point/Point";
import {Mbr} from "../Items/Mbr/Mbr";
import {Camera} from "../Camera";
import {Pointer} from "../Pointer";
import type {BaseItem} from "../Items/BaseItem/BaseItem";
import {ItemsIndexRecord} from "../BoardOperations";
import {Items, ISpatialIndex, coerceMbr} from "./SpacialIndex";

export class SimpleSpatialIndex implements ISpatialIndex {
  subject = new Subject<Items>();
  private itemsArray: Item[] = [];
  private Mbr = new Mbr();
  readonly items: Items;

  constructor(view: Camera, pointer: Pointer) {
    this.items = new Items(this, view, pointer, this.subject);
  }

  clear(): void {
    this.itemsArray = [];
    this.Mbr = new Mbr();
  }

  insert(item: Item): void {
    if (this.itemsArray.includes(item) || this.getById(item.getId())) {
      return;
    }
    this.itemsArray.push(item);

    if (this.Mbr.getWidth() === 0 && this.Mbr.getHeight() === 0) {
      this.Mbr = item.getMbr().copy();
    } else {
      this.Mbr.combine([item.getMbr()]);
    }
    item.subject.subscribe(this.change);
    this.subject.publish(this.items);
  }

  change = (item: Item): void => {
    if (this.Mbr.getWidth() === 0 && this.Mbr.getHeight() === 0) {
      this.Mbr = item.getMbr().copy();
    } else {
      this.Mbr.combine([item.getMbr()]);
    }
    this.subject.publish(this.items);
  };

  remove(item: Item, preserveChildren = false): void {
    if (!preserveChildren && "index" in item && item.index) {
      item.removeChildItems(item.index.listAll());
    }
    // if (item.parent !== 'Board') {
    //   const parentFrame = this.items.getById(item.parent) as BaseItem;
    //   parentFrame?.removeChildItems(item);
    // }
    const index = this.itemsArray.indexOf(item);
    if (index !== -1) {
      this.itemsArray.splice(index, 1);
    }

    this.Mbr = new Mbr();
    this.itemsArray.forEach(item => this.Mbr.combine([item.getMbr()]));

    this.subject.publish(this.items);
  }

  copy(): ItemDataWithId[] {
    return  this.itemsArray.map(item => ({
      ...item.serialize(),
      id: item.getId(),
    }));
  }

  moveToZIndex(item: Item, zIndex: number): void {
    const index = this.itemsArray.indexOf(item);
    this.itemsArray.splice(index, 1);
    this.itemsArray.splice(zIndex, 0, item);
    this.change(item);
    this.subject.publish(this.items);
  }

  moveManyToZIndex(itemsRecord: ItemsIndexRecord): void {
    const items = Object.keys(itemsRecord)
      .map(id => this.items.getById(id))
      .filter(item => item !== undefined) as Item[];
    const zIndex = Object.values(itemsRecord);

    for (let i = 0; i < zIndex.length; i++) {
      const index = zIndex[i];
      this.itemsArray[index] = items[i];
    }

    this.itemsArray.forEach(this.change.bind(this));
  }

  sendToBack(item: Item, shouldPublish = true): void {
    const index = this.itemsArray.indexOf(item);
    this.itemsArray.splice(index, 1);
    this.itemsArray.unshift(item);
    if (shouldPublish) {
      this.subject.publish(this.items);
    }
  }

  sendManyToBack(items: Item[]): void {
    const newItems: Item[] = [...items];
    this.itemsArray.forEach(item => {
      if (!items.includes(item)) {
        newItems.push(item);
      }
    });
    this.itemsArray = newItems;
    this.itemsArray.forEach(this.change.bind(this));
  }

  bringToFront(item: Item, shouldPublish = true): void {
    const index = this.itemsArray.indexOf(item);
    this.itemsArray.splice(index, 1);
    this.itemsArray.push(item);
    if (shouldPublish) {
      this.subject.publish(this.items);
    }
  }

  bringManyToFront(items: Item[]): void {
    const newItems: Item[] = [];
    this.itemsArray.forEach(item => {
      if (!items.includes(item)) {
        newItems.push(item);
      }
    });
    newItems.push(...items);
    this.itemsArray = newItems;
    this.itemsArray.forEach(this.change.bind(this));
  }

  moveSecondAfterFirst(first: Item, second: Item): void {
    const secondIndex = this.itemsArray.indexOf(second);
    this.itemsArray.splice(secondIndex, 1);
    const firstIndex = this.itemsArray.indexOf(first);
    this.itemsArray.splice(firstIndex + 1, 0, second);
    this.change(first);
    this.change(second);
    this.subject.publish(this.items);
  }

  moveSecondBeforeFirst(first: Item, second: Item): void {
    const secondIndex = this.itemsArray.indexOf(second);
    this.itemsArray.splice(secondIndex, 1);
    const firstIndex = this.itemsArray.indexOf(first);
    this.itemsArray.splice(firstIndex, 0, second);
    this.change(first);
    this.change(second);
    this.subject.publish(this.items);
  }

  getById(id: string): Item | undefined {
    return this.itemsArray.find(item => item.getId() === id);
  }

  findById(id: string): Item | undefined {
    return this.getById(id);
  }

  listEnclosedBy(left: number | Mbr | { left: number; top: number; right: number; bottom: number }, top?: number, right?: number, bottom?: number): Item[] {
    const mbr = coerceMbr(left, top, right, bottom);
    const items: Item[] = [];
    this.itemsArray.forEach((item: Item) => {
      if (item.isEnclosedBy(mbr)) {
        items.push(item);
      }
    })
    return items;
  }

  listEnclosedOrCrossedBy(left: number | Mbr | { left: number; top: number; right: number; bottom: number }, top?: number, right?: number, bottom?: number): Item[] {
    const mbr = coerceMbr(left, top, right, bottom);
    const items: Item[] = [];
    this.itemsArray.forEach((item: Item) => {
      if (item.isEnclosedOrCrossedBy(mbr)) {
        items.push(item);
      }
    })
    return items;
  }

  listUnderPoint(point: Point, tolerance = 5): Item[] {
    const items: Item[] = [];
    this.itemsArray.forEach((item: Item) => {
      if (item.isUnderPoint(point, tolerance)) {
        items.push(item);
      }
    })
    return items;
  }

  listRectsEnclosedOrCrossedBy(left: number | Mbr | { left: number; top: number; right: number; bottom: number }, top?: number, right?: number, bottom?: number): Mbr[] {
    return this.listEnclosedOrCrossedBy(left, top, right, bottom).map(item => item.getMbr());
  }

  listNearestTo(
    point: Point,
    maxItems: number,
    filter: (item: Item) => boolean,
    maxDistance: number
  ): Item[] {
    const itemsWithDistance = this.itemsArray
      .filter(filter)
      .map(item => ({
        item,
        distance: item.getMbr().getDistanceToPoint(point)
      }));

    const inRange = itemsWithDistance.filter(x => x.distance <= maxDistance);

    return inRange
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxItems)
      .map(x => x.item);
  }

  getMbr(): Mbr {
    return this.Mbr;
  }

  listAll(): Item[] {
    return this.itemsArray.concat();
  }

  getZIndex(item: Item): number {
    return this.itemsArray.indexOf(item);
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

  render(context: DrawingContext) {
    this.itemsArray.forEach(item => {
      item.render(context);
    })
  }
}
