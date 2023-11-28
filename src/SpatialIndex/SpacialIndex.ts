import { Mbr, Point } from "Board/Items";
import { Item } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Pointer } from "Board/Pointer";
import { Subject } from "Subject";
import { Camera } from "Board/Camera";
import { LayeredIndex } from "./LayeredIndex";

export class SpatialIndex {
	subject = new Subject<Items>();
	private array: Item[] = [];
	private index = new LayeredIndex((item: Item): number => {
		return this.array.indexOf(item);
	});
	private Mbr = new Mbr();
	readonly items: Items;

	constructor(view: Camera, pointer: Pointer) {
		this.items = new Items(this, view, pointer, this.subject);
	}

	insert(item: Item): void {
		this.array.push(item);
		this.index.insert(item);
		this.Mbr.combine([item.getMbr()]);
		item.subject.subscribe(this.change);
		this.subject.publish(this.items);
	}

	change = (item: Item): void => {
		this.index.change(item);
		this.Mbr.combine([item.getMbr()]);
		this.subject.publish(this.items);
	};

	remove(item: Item): void {
		this.array.splice(this.array.indexOf(item), 1);
		this.index.remove(item);
		this.subject.publish(this.items);
	}

	moveToZIndex(item: Item, zIndex: number): void {
		const index = this.array.indexOf(item);
		this.array.splice(index, 1);
		this.array.splice(zIndex, 0, item);
		this.change(item);
		this.subject.publish(this.items);
	}

	sendToBack(item: Item): void {
		const index = this.array.indexOf(item);
		this.array.splice(index, 1);
		this.array.unshift(item);
		this.change(item);
		this.subject.publish(this.items);
	}

	bringToFront(item: Item): void {
		const index = this.array.indexOf(item);
		this.array.splice(index, 1);
		this.array.push(item);
		this.change(item);
		this.subject.publish(this.items);
	}

	moveSecondAfterFirst(first: Item, second: Item): void {
		const secondIndex = this.array.indexOf(second);
		this.array.splice(secondIndex, 1);
		const firstIndex = this.array.indexOf(first);
		this.array.splice(firstIndex + 1, 0, second);
		this.change(first);
		this.change(second);
		this.subject.publish(this.items);
	}

	moveSecondBeforeFirst(first: Item, second: Item): void {
		const secondIndex = this.array.indexOf(second);
		this.array.splice(secondIndex, 1);
		const firstIndex = this.array.indexOf(first);
		this.array.splice(firstIndex, 0, second);
		this.change(first);
		this.change(second);
		this.subject.publish(this.items);
	}

	getById(id: string): Item | undefined {
		return this.index.findById(id);
	}

	findById(id: string): Item | undefined {
		return this.index.findById(id);
	}

	getEnclosed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		return this.index.getEnclosedOrCrossedBy(
			new Mbr(left, top, right, bottom),
		);
	}

	getEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		return this.index.getEnclosedOrCrossedBy(
			new Mbr(left, top, right, bottom),
		);
	}

	getRectsEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		return this.index.getRectsEnclosedOrCrossedBy(
			new Mbr(left, top, right, bottom),
		);
	}

	getMbr(): Mbr {
		return this.Mbr;
	}

	getNearestTo(
		point: Point,
		maxItems: number,
		filter: (item: Item) => boolean,
		maxDistance: number,
	): Item[] {
		return this.index.getNearestTo(point, maxItems, filter, maxDistance);
	}

	list(): Item[] {
		return this.array.concat();
	}

	getZIndex(item: Item): number {
		return this.array.indexOf(item);
	}

	getLastZIndex(): number {
		return this.array.length - 1;
	}

	getByZIndex(index: number): Item {
		const lastIndex = this.getLastZIndex();
		if (index < 0) {
			return this.array[0];
		} else if (index < lastIndex) {
			return this.array[index];
		} else {
			return this.array[lastIndex];
		}
	}
}

export class Items {
	constructor(
		private index: SpatialIndex,
		private view: Camera,
		private pointer: Pointer,
		readonly subject: Subject<Items>,
	) {}

	update(item: Item): void {
		this.index.change(item);
	}

	listAll(): Item[] {
		return this.index.list();
	}

	getById(id: string): Item | undefined {
		return this.index.getById(id);
	}

	findById(id: string): Item | undefined {
		return this.index.findById(id);
	}

	getEnclosed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		return this.index.getEnclosedOrCrossed(left, top, right, bottom);
	}

	getEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		return this.index.getEnclosedOrCrossed(left, top, right, bottom);
	}

	getMbr(): Mbr {
		return this.index.getMbr();
	}

	getInView(): Item[] {
		const { left, top, right, bottom } = this.view.getMbr();
		return this.index.getRectsEnclosedOrCrossed(left, top, right, bottom);
	}

	getUnderPointer(size = 16): Item[] {
		const { x, y } = this.pointer.point;
		size = size / this.view.getScale();
		return this.index.getEnclosedOrCrossed(
			x - size,
			y - size,
			x + size,
			y + size,
		);
	}

	getNearPointer(
		maxDistance = 100,
		maxItems = 10,
		filter: (item: Item) => boolean = () => true,
	): Item[] {
		return this.index.getNearestTo(
			this.pointer.point,
			maxItems,
			filter,
			maxDistance,
		);
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

	render(context: DrawingContext): void {
		const inView = this.getInView();
		for (const item of inView) {
			item.render(context);
		}
	}
}
