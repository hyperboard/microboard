import { Frame, Mbr, Point } from "Board/Items";
import { Item } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Pointer } from "Board/Pointer";
import { Subject } from "Subject";
import { Camera } from "Board/Camera";
import { LayeredIndex } from "./LayeredIndex";
import { ItemsIndexRecord } from "../BoardOperations";

export class SpatialIndex {
	subject = new Subject<Items>();
	private itemsArray: Exclude<Item, Frame>[] = [];
	private framesArray: Frame[] = [];
	private itemsIndex = new LayeredIndex(
		(item: Exclude<Item, Frame>): number => {
			return this.itemsArray.indexOf(item);
		},
	);
	private framesIndex = new LayeredIndex((item: Frame): number => {
		return this.itemsArray.indexOf(item);
	});
	private Mbr = new Mbr();
	readonly items: Items;

	constructor(view: Camera, pointer: Pointer) {
		this.items = new Items(this, view, pointer, this.subject);
	}

	insert(item: Item): void {
		if (item instanceof Frame) {
			this.framesArray.push(item);
			this.framesIndex.insert(item);
		} else {
			this.itemsArray.push(item);
			this.itemsIndex.insert(item);
		}
		this.Mbr.combine([item.getMbr()]);
		item.subject.subscribe(this.change);
		this.subject.publish(this.items);
	}

	change = (item: Item): void => {
		if (item instanceof Frame) {
			this.framesIndex.change(item);
		} else {
			this.itemsIndex.change(item);
		}
		this.Mbr.combine([item.getMbr()]);
		this.subject.publish(this.items);
	};

	remove(item: Item): void {
		if (item instanceof Frame) {
			item.getChildrenIds()
				.map(childId => this.getById(childId))
				.filter(child => child !== undefined)
				.forEach(child => {
					item.removeChild(child.getId()); // not sure if it is necessary for being able to undo
					child.parent = "Board";
				});
		}
		if (item.parent !== "Board") {
			const parentFrame = this.items.getById(item.parent) as Frame;
			parentFrame.removeChild(item.getId());
			item.parent = "Board"; // not sure if it is necessary for being able to undo
		}
		if (item instanceof Frame) {
			this.framesArray.splice(this.framesArray.indexOf(item), 1);
			this.framesIndex.remove(item);
		} else {
			this.itemsArray.splice(this.itemsArray.indexOf(item), 1);
			this.itemsIndex.remove(item);
		}

		this.subject.publish(this.items);
	}

	moveToZIndex(item: Item, zIndex: number): void {
		if (item instanceof Frame) {
			const index = this.framesArray.indexOf(item);
			this.framesArray.splice(index, 1);
			this.framesArray.splice(zIndex, 0, item);
		} else {
			const index = this.itemsArray.indexOf(item);
			this.itemsArray.splice(index, 1);
			this.itemsArray.splice(zIndex, 0, item);
		}
		this.change(item);
		this.subject.publish(this.items);
	}

	moveManyToZIndex(itemsRecord: ItemsIndexRecord): void {
		const items = Object.keys(itemsRecord)
			.map(id => this.items.getById(id))
			.filter(item => item !== undefined);
		const zIndex = Object.values(itemsRecord);
		const newItems: Item[] = [];
		for (let i = 0; i < zIndex.length; i++) {
			const index = zIndex[i];
			newItems[index] = items[i] as Item;
		}

		this.array = newItems;
		this.array.forEach(this.change.bind(this));
		this.subject.publish(this.items);
	}

	sendToBack(item: Item, shouldPublish = true): void {
		if (item instanceof Frame) {
			const index = this.framesArray.indexOf(item);
			this.framesArray.splice(index, 1);
			this.framesArray.unshift(item);
			this.framesIndex.change(item);
		} else {
			const index = this.itemsArray.indexOf(item);
			this.itemsArray.splice(index, 1);
			this.itemsArray.unshift(item);
			this.itemsIndex.change(item);
		}
		if (shouldPublish) {
			this.subject.publish(this.items);
		}
	}

	sendManyToBack(items: Item[]) {
		items.forEach(item => this.sendToBack(item, false));
		this.subject.publish(this.items);
	}

	bringToFront(item: Item, shouldPublish = true): void {
		if (item instanceof Frame) {
			const index = this.framesArray.indexOf(item);
			this.framesArray.splice(index, 1);
			this.framesArray.push(item);
			this.framesIndex.change(item);
		} else {
			const index = this.itemsArray.indexOf(item);
			this.itemsArray.splice(index, 1);
			this.itemsArray.push(item);
			this.itemsIndex.change(item);
		}
		if (shouldPublish) {
			this.subject.publish(this.items);
		}
	}

	bringManyToFront(items: Item[]) {
		items.forEach(item => this.bringToFront(item, false));
		this.subject.publish(this.items);
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
		const item = this.itemsArray.find(item => item.getId() === id);
		if (item) {
			return item;
		}
		const frame = this.framesArray.find(frame => frame.getId() === id);
		return frame;
	}

	findById(id: string): Item | undefined {
		return this.getById(id); // Reuse `getById` for consistency
	}

	getEnclosed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		const mbr = new Mbr(left, top, right, bottom);
		const enclosedItems = this.itemsIndex.getEnclosed(mbr);
		const enclosedFrames = this.framesIndex.getEnclosed(mbr);
		return enclosedFrames.concat(enclosedItems);
	}

	getEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		const mbr = new Mbr(left, top, right, bottom);
		const enclosedOrCrossedItems =
			this.itemsIndex.getEnclosedOrCrossedBy(mbr);
		const enclosedOrCrossedFrames =
			this.framesIndex.getEnclosedOrCrossedBy(mbr);
		return enclosedOrCrossedFrames.concat(enclosedOrCrossedItems);
	}

	getRectsEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		const mbr = new Mbr(left, top, right, bottom);

		return this.framesIndex
			.getRectsEnclosedOrCrossedBy(mbr)
			.concat(this.itemsIndex.getRectsEnclosedOrCrossedBy(mbr));
	}

	getFramesEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Frame[] {
		return this.framesIndex.getRectsEnclosedOrCrossedBy(
			new Mbr(left, top, right, bottom),
		) as Frame[];
	}

	getItemsEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		return this.itemsIndex.getRectsEnclosedOrCrossedBy(
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
		// Requires combining results from both indexes and sorting by distance, limited by maxItems.
		const nearestItems = this.itemsIndex.getNearestTo(
			point,
			maxItems,
			filter,
			maxDistance,
		);
		const nearestFrames = this.framesIndex.getNearestTo(
			point,
			maxItems,
			filter,
			maxDistance,
		);
		const combined = nearestItems.concat(nearestFrames);
		combined.sort((a, b) => {
			const distA = point.getDistance(a.getMbr().getCenter());
			const distB = point.getDistance(b.getMbr().getCenter());
			return distA - distB;
		});
		return combined.slice(0, maxItems);
	}

	list(): Item[] {
		return this.itemsArray.concat();
	}

	listFrames(): Frame[] {
		return this.framesArray.concat();
	}

	getZIndex(item: Item): number {
		if (item instanceof Frame) {
			return this.framesArray.indexOf(item);
		} else {
			return this.itemsArray.indexOf(item);
		}
	}

	getLastZIndex(): number {
		// Considering zIndex is across both items and frames
		return this.itemsArray.length + this.framesArray.length - 1;
	}

	getByZIndex(index: number): Item {
		// Handles single unified zIndex across both frames and items
		const totalItems = this.itemsArray.length + this.framesArray.length;

		if (index < this.itemsArray.length) {
			return this.itemsArray[index];
		} else if (index < totalItems) {
			return this.framesArray[index - this.itemsArray.length];
		} else {
			// If index is out of bounds, return the last item by adjusted index
			const lastIndex = this.getLastZIndex();
			if (index - this.itemsArray.length < this.framesArray.length) {
				return this.framesArray[lastIndex];
			} else {
				return this.itemsArray[lastIndex];
			}
		}
	}
}

export class SlowSpatialIndex {
	private array: Item[] = [];
	subject = new Subject<Items>();
	readonly items: Items;
	private mbr = new Mbr();

	constructor(view: Camera, pointer: Pointer) {
		this.items = new Items(this, view, pointer, this.subject);
	}

	insert(item: Item): void {
		this.array.push(item);
		this.subject.publish(this.items);
		this.updateMbr(item.getMbr());
	}

	change(item: Item): void {
		this.updateMbr(item.getMbr());
		this.subject.publish(this.items);
	}

	remove(item: Item): void {
		const index = this.array.indexOf(item);
		if (index > -1) {
			this.array.splice(index, 1);
		}
		this.subject.publish(this.items);
	}

	moveToZIndex(item: Item, zIndex: number): void {
		this.remove(item);
		// Вставить элемент на новый индекс, обеспечивая валидность диапазона.
		zIndex = Math.max(0, Math.min(zIndex, this.array.length));
		this.array.splice(zIndex, 0, item);
		this.subject.publish(this.items);
	}

	sendToBack(item: Item): void {
		this.remove(item);
		this.array.unshift(item);
		this.subject.publish(this.items);
	}

	bringToFront(item: Item): void {
		this.remove(item);
		this.array.push(item);
		this.subject.publish(this.items);
	}

	moveSecondAfterFirst(first: Item, second: Item): void {
		this.remove(second);
		const firstIndex = this.array.indexOf(first);
		// Вставить второй элемент сразу за первым элементом.
		this.array.splice(firstIndex + 1, 0, second);
		this.subject.publish(this.items);
	}

	moveSecondBeforeFirst(first: Item, second: Item): void {
		this.remove(second);
		const firstIndex = this.array.indexOf(first);
		// Вставить второй элемент перед первым элементом.
		this.array.splice(firstIndex, 0, second);
		this.subject.publish(this.items);
	}

	getById(id: string): Item | undefined {
		return this.findById(id);
	}

	// Для findById разумнее будет хранить ассоциацию через Map, если у вас есть уникальные идентификаторы.
	findById(id: string): Item | undefined {
		return this.array.find(item => item.getId() === id);
	}

	getEnclosedOrCrossedBy(mbr: Mbr): Item[] {
		return this.array.filter(item => item.isEnclosedOrCrossedBy(mbr));
	}

	getEnclosed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		const searchMbr = new Mbr(left, top, right, bottom);
		return this.items.filter(item => {
			const itemMbr = item.getMbr();
			return (
				itemMbr.left >= searchMbr.left &&
				itemMbr.right <= searchMbr.right &&
				itemMbr.top >= searchMbr.top &&
				itemMbr.bottom <= searchMbr.bottom
			);
		});
	}

	getEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		return this.getEnclosedOrCrossedBy(new Mbr(left, top, right, bottom));
	}

	getRectsEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		// В этом случае метод полностью идентичен getEnclosedOrCrossed,
		// но в общем случае может вести себя иначе, если требуется специфическая логика.
		return this.getEnclosedOrCrossed(left, top, right, bottom);
	}

	getMbr(): Mbr {
		return this.mbr;
	}

	private updateMbr(newMbr: Mbr): void {
		// Обновляет общий MBR после вставки каждого нового элемента
		this.mbr.left = Math.min(this.mbr.left, newMbr.left);
		this.mbr.top = Math.min(this.mbr.top, newMbr.top);
		this.mbr.right = Math.max(this.mbr.right, newMbr.right);
		this.mbr.bottom = Math.max(this.mbr.bottom, newMbr.bottom);
	}

	getNearestTo(
		point: Point,
		maxItems: number,
		filter: (item: Item) => boolean,
		maxDistance?: number,
	): Item[] {
		// Функция помощник для расчета расстояния между точками.
		const distance = (a: Point, b: Point): number =>
			Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

		return this.array
			.filter(item => filter(item))
			.map(item => ({
				item,
				distance: distance(point, item.getCenter()),
			}))
			.filter(
				({ distance }) =>
					maxDistance === undefined || distance <= maxDistance,
			)
			.sort((a, b) => a.distance - b.distance)
			.slice(0, maxItems)
			.map(({ item }) => item);
	}

	list(): Item[] {
		// Возвращает копию массива, чтобы предотвратить изменение извне.
		return [...this.array];
	}

	getZIndex(item: Item): number {
		// Возвращает индекс элемента в массиве, что соответствует его Z индексу.
		return this.array.indexOf(item);
	}

	getLastZIndex(): number {
		return this.array.length - 1;
	}

	getByZIndex(zIndex: number): Item | undefined {
		// Получает элемент по его Z индексу.
		if (zIndex >= 0 && zIndex < this.array.length) {
			return this.array[zIndex];
		}
		return undefined;
	}
}

export class Items {
	constructor(
		public index: SpatialIndex,
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

	listFrames(): Frame[] {
		return this.index.listFrames();
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
		return this.index.getEnclosed(left, top, right, bottom);
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

	getItemsInView(): Exclude<Item, Frame>[] {
		const { left, top, right, bottom } = this.view.getMbr();
		return this.index.getItemsEnclosedOrCrossed(left, top, right, bottom);
	}

	getFramesInView(): Frame[] {
		const { left, top, right, bottom } = this.view.getMbr();
		return this.index.getFramesEnclosedOrCrossed(left, top, right, bottom);
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
		const frames = this.getFramesInView();
		const rest = this.getItemsInView();

		frames.forEach(frame => frame.renderPath(context)); // background of frames
		rest.forEach(item => item.render(context)); // non-frame items
		frames.forEach(frame => frame.renderBorders(context)); // borders of frames
		frames.forEach(frame => frame.renderName(context)); // names of frames
	}
}
