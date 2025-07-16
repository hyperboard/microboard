import {Subject} from "../Subject";
import {DrawingContext, Item, Point, Mbr} from "../Items";
import {Camera} from "../Camera";
import {Pointer} from "../Pointer";
import {BaseItem} from "../Items/BaseItem";
import {ItemDataWithId} from "../Items/Item";
import {ItemsIndexRecord} from "../BoardOperations";
import {Items} from "./SpacialIndex";

export class SimpleSpatialIndex {
  subject = new Subject<Items>();
  private itemsArray: Item[] = [];
  private Mbr = new Mbr();
  readonly items: Items;

  constructor(view: Camera, pointer: Pointer) {
    this.items = new Items(this as any, view, pointer, this.subject);
  }

  clear(): void {
    this.itemsArray = [];
    this.Mbr = new Mbr();
  }

  insert(item: Item): void {
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

  remove(item: Item): void {
    if ("index" in item && item.index) {
      item.removeChildItems(item.index.list());
    }
    if (item.parent !== 'Board') {
      const parentFrame = this.items.getById(item.parent) as BaseItem;
      parentFrame?.removeChildItems(item);
    }
    this.itemsArray.splice(this.itemsArray.indexOf(item), 1);

    this.Mbr = new Mbr();
    this.itemsArray.forEach(item => this.Mbr.combine([item.getMbr()]));

    this.subject.publish(this.items);
  }

  copy(): ItemDataWithId[] {
    return  this.itemsArray.map(item => ({
      ...item.serialize(true),
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
      .filter(item => item !== undefined);
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

  getById(id: string): BaseItem | undefined {
    const item = this.itemsArray.find(item => item.getId() === id);
    if (item) {
      return item as BaseItem;
    }
  }

  findById(id: string): Item | undefined {
    return this.getById(id); // Reuse `getById` for consistency
  }

  getEnclosed(left: number, top: number, right: number, bottom: number): Item[] {
    const mbr = new Mbr(left, top, right, bottom);
    const items: Item[] = [];
    this.itemsArray.forEach((item: Item) => {
      if (item.isEnclosedBy(mbr)) {
        items.push(item);
      }
    })
    return items;
  }

  getEnclosedOrCrossed(left: number, top: number, right: number, bottom: number): Item[] {
    const mbr = new Mbr(left, top, right, bottom);
    const items: Item[] = [];
    this.itemsArray.forEach((item: Item) => {
      if (item.isEnclosedOrCrossedBy(mbr)) {
        items.push(item);
      }
    })
    return items;
  }

  getUnderPoint(point: Point, tolerace = 5): Item[] {
    const items: Item[] = [];
    this.itemsArray.forEach((item: Item) => {
      if (item.isUnderPoint(point, tolerace)) {
        items.push(item);
      }
    })
    return items;
  }

  getMbr(): Mbr {
    return this.itemsArray[0].getMbr().combine(this.itemsArray.slice(1).map(item => item.getMbr()));
  }

  list(): Item[] {
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
