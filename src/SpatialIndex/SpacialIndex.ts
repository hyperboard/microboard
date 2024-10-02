import { Camera } from "Board/Camera";
import { Connector, Frame, Item, ItemData, Mbr, Point } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Pointer } from "Board/Pointer";
import { Subject } from "Subject";
import { ItemsIndexRecord } from "../BoardOperations";
import { LayeredIndex } from "./LayeredIndex";
import { Drawing } from "../Items/Drawing";

type ItemWoFrames = Exclude<Item, Frame>;

export class SpatialIndex {
	subject = new Subject<Items>();
	private itemsArray: ItemWoFrames[] = [];
	private framesArray: Frame[] = [];
	private itemsIndex = new LayeredIndex((item: ItemWoFrames): number => {
		return this.itemsArray.indexOf(item);
	});
	private framesIndex = new LayeredIndex((item: Frame): number => {
		return this.framesArray.indexOf(item);
	});
	private Mbr = new Mbr();
	readonly items: Items;

	constructor(view: Camera, pointer: Pointer) {
		this.items = new Items(this, view, pointer, this.subject);
	}

	clear(): void {
		this.itemsArray = [];
		this.framesArray = [];
		this.itemsIndex = new LayeredIndex((item: ItemWoFrames): number => {
			return this.itemsArray.indexOf(item);
		});
		this.framesIndex = new LayeredIndex((item: Frame): number => {
			return this.framesArray.indexOf(item);
		});
		this.Mbr = new Mbr();
	}

	insert(item: Item): void {
		if (item instanceof Frame) {
			this.framesArray.push(item);
			this.framesIndex.insert(item);
		} else {
			this.itemsArray.push(item);
			this.itemsIndex.insert(item);
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
		if (item instanceof Frame) {
			this.framesIndex.change(item);
		} else {
			this.itemsIndex.change(item);
		}
		if (this.Mbr.getWidth() === 0 && this.Mbr.getHeight() === 0) {
			this.Mbr = item.getMbr().copy();
		} else {
			this.Mbr.combine([item.getMbr()]);
		}
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

	copy(): Record<string, ItemData> {
		const items = this.itemsArray.reduce((accumulator, item, i) => {
			accumulator[item.getId()] = { ...item.serialize(), zIndex: i };
			return accumulator;
		}, {} as Record<string, ItemData>);
		const itemsAndFrames = this.framesArray.reduce(
			(accumulator, item, i) => {
				accumulator[item.getId()] = { ...item.serialize(), zIndex: i };
				return accumulator;
			},
			items as Record<string, ItemData>,
		);
		return itemsAndFrames;
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
		// const newItems: Item[] = [];
		for (let i = 0; i < zIndex.length; i++) {
			const index = zIndex[i];
			this.itemsArray[index] = items[i] as ItemWoFrames;
		}

		this.itemsArray.forEach(this.change.bind(this));
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

	sendManyToBack(items: ItemWoFrames[]): void {
		const newItems: ItemWoFrames[] = [...items];
		this.itemsArray.forEach(item => {
			if (!items.includes(item)) {
				newItems.push(item);
			}
		});
		this.itemsArray = newItems;
		this.itemsArray.forEach(this.change.bind(this));
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

	bringManyToFront(items: ItemWoFrames[]): void {
		const newItems: ItemWoFrames[] = [];
		this.itemsArray.forEach(item => {
			if (!items.includes(item)) {
				newItems.push(item);
			}
		});
		newItems.push(...items);
		this.itemsArray = newItems;
		this.itemsArray.forEach(this.change.bind(this));
	}
	// TODO Item could be frame
	moveSecondAfterFirst(first: ItemWoFrames, second: ItemWoFrames): void {
		const secondIndex = this.itemsArray.indexOf(second);
		this.itemsArray.splice(secondIndex, 1);
		const firstIndex = this.itemsArray.indexOf(first);
		this.itemsArray.splice(firstIndex + 1, 0, second);
		this.change(first);
		this.change(second);
		this.subject.publish(this.items);
	}
	// TODO Item could be frame
	moveSecondBeforeFirst(first: ItemWoFrames, second: ItemWoFrames): void {
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

	getUnderPoint(point: Point, tolerace = 5): Item[] {
		const itemsUnderPoint = this.itemsIndex.getUnderPoint(point, tolerace);
		const framesUnderPoint = this.framesIndex.getUnderPoint(
			point,
			tolerace,
		);
		return [...framesUnderPoint, ...itemsUnderPoint];
	}

	getRectsEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Item[] {
		const mbr = new Mbr(left, top, right, bottom);
		const frames = this.framesIndex.getRectsEnclosedOrCrossedBy(mbr);
		const woFrames = this.itemsIndex.getRectsEnclosedOrCrossedBy(mbr);

		return [...woFrames, ...frames];
	}

	getFramesEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Frame[] {
		return this.framesIndex.getRectsEnclosedOrCrossedBy(
			new Mbr(left, top, right, bottom),
		);
	}

	getItemsEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): ItemWoFrames[] {
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
		combined.sort((aa, bb) => {
			const distA = point.getDistance(aa.getMbr().getCenter());
			const distB = point.getDistance(bb.getMbr().getCenter());
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

	getUnderPoint(point: Point, tolerance = 5): Item[] {
		return this.index.getUnderPoint(point, tolerance);
	}

	getMbr(): Mbr {
		return this.index.getMbr();
	}

	getInView(): Item[] {
		const { left, top, right, bottom } = this.view.getMbr();
		return this.index.getRectsEnclosedOrCrossed(left, top, right, bottom);
	}

	getItemsInView(): ItemWoFrames[] {
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
		const frameSize = size * 2;
		const tolerated = this.index.getEnclosedOrCrossed(
			x - size,
			y - frameSize,
			x + size,
			y + size,
		);

		let enclosed =
			tolerated.filter(
				item => !(item instanceof Frame || item instanceof Connector),
			).length <= 1
				? tolerated
				: this.index.getEnclosedOrCrossed(x, y, x, y);

		const underPointer = this.getUnderPoint(new Point(x, y), size);
		if (enclosed.length === 0) {
			enclosed = underPointer;
		}

		if (underPointer.some(item => item instanceof Drawing)) {
			enclosed = [...underPointer, ...enclosed];
		}

		const { nearest } = enclosed.reduce(
			(acc, item) => {
				const area =
					item.getMbr().getHeight() * item.getMbr().getWidth();
				const isItemTransparent =
					item?.itemType === "Shape" &&
					item?.getBackgroundColor() === "none";
				const itemZIndex = this.getZIndex(item);
				const accZIndex = this.getZIndex(acc.nearest!);

				if (
					(itemZIndex > accZIndex &&
						(!isItemTransparent || area === acc.area)) ||
					area < acc.area
				) {
					return { nearest: item, area };
				}

				return acc;
			},
			{ nearest: undefined, area: Infinity } as {
				nearest?: Item;
				area: number;
			},
		);

		return nearest ? [nearest] : [];
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
