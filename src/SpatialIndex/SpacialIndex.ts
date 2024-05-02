import { Mbr, Point } from "Board/Items";
import { Item } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Pointer } from "Board/Pointer";
import { Subject } from "Subject";
import { Camera } from "Board/Camera";
import { LayeredIndex } from "./LayeredIndex";

export class SpatialIndex {
	subject = new Subject<Items>();
	readonly array: Item[] = [];
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
		this.array.forEach(this.change.bind(this));
		this.subject.publish(this.items);
	}

	sendToBack(item: Item): void {
		const index = this.array.indexOf(item);
		this.array.splice(index, 1);
		this.array.unshift(item);
		this.array.forEach(this.change.bind(this));
		this.subject.publish(this.items);
	}

	sendManyToBack(items: Item[]) {
		const newItems: Item[] = [...items];
		this.array.forEach(item => {
			if (!items.includes(item)) {
				newItems.push(item);
			}
		});
		this.array = newItems;
		this.array.forEach(this.change.bind(this));
		this.subject.publish(this.items);
	}

	bringToFront(item: Item): void {
		const index = this.array.indexOf(item);
		this.array.splice(index, 1);
		this.array.push(item);
		this.array.forEach(this.change.bind(this));
		this.subject.publish(this.items);
	}

	bringManyToFront(items: Item[]) {
		const newItems: Item[] = [];
		this.array.forEach(item => {
			if (!items.includes(item)) {
				newItems.push(item);
			}
		});
		newItems.push(...items);
		this.array = newItems;
		this.array.forEach(this.change.bind(this));
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
