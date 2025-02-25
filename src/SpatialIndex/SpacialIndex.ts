import { Camera } from "Board/Camera";
import { Connector, Frame, Item, ItemData, Mbr, Point } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Pointer } from "Board/Pointer";
import { Subject } from "Subject";
import { ItemsIndexRecord } from "../BoardOperations";
import { LayeredIndex } from "./LayeredIndex";
import { Drawing } from "Board/Items/Drawing";
import { Comment } from "../Items/Comment";
import { positionRelatively, translateElementBy } from "Board/HTMLRender";

export type ItemWoFrames = Exclude<Item, Frame>;

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
					item.emitRemoveChild(child);
				});
		}
		if (item.parent !== "Board") {
			const parentFrame = this.items.getById(item.parent) as
				| Frame
				| undefined;
			parentFrame?.emitRemoveChild(item);
		}
		if (item instanceof Frame) {
			this.framesArray.splice(this.framesArray.indexOf(item), 1);
			this.framesIndex.remove(item);
		} else {
			this.itemsArray.splice(this.itemsArray.indexOf(item), 1);
			this.itemsIndex.remove(item);
		}

		this.Mbr = new Mbr();
		const allItems = [...this.itemsArray, ...this.framesArray];
		allItems.forEach(item => this.Mbr.combine([item.getMbr()]));

		this.subject.publish(this.items);
	}

	copy(): (ItemData & { id: string })[] {
		const itemsData = this.itemsArray.map(item => ({
			...item.serialize(true),
			id: item.getId(),
		}));
		const framesData = this.framesArray.map(item => ({
			...item.serialize(),
			id: item.getId(),
		}));
		return [...framesData, ...itemsData];
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

	getComments(): Comment[] {
		return this.itemsArray.filter(
			item => item instanceof Comment,
		) as Comment[];
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

	list(): ItemWoFrames[] {
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

	listAll(): ItemWoFrames[] {
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

	getFramesEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Frame[] {
		return this.index.getFramesEnclosedOrCrossed(left, top, right, bottom);
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

	getComments(): Comment[] {
		return this.index.getComments();
	}

	getUnderPointer(size = 0): Item[] {
		const { x, y } = this.pointer.point;
		const unmodifiedSize = size;
		size = 16 / this.view.getScale();
		const tolerated = this.index.getEnclosedOrCrossed(
			x - size,
			y - size,
			x + size,
			y + size,
		);

		const groups = tolerated.filter(item => item.itemType === "Group");
		if (groups.length > 0) {
			return groups;
		}

		let enclosed = tolerated.some(item => item instanceof Connector)
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

		if (nearest) {
			return [nearest];
		}

		const frames = this.index
			.listFrames()
			.filter(frame => frame.isTextUnderPoint(this.pointer.point));
		if (frames.length === 0 && unmodifiedSize !== 16) {
			return this.getUnderPointer(16);
		}
		return frames;
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

	getConnectorsPointById(id: string): Connector[] {
		return this.listAll().filter(item => {
			if (item.itemType !== "Connector") {
				return false;
			}

			const { startItem, endItem } = item.getConnectedItems();
			if (startItem?.getId() === id || endItem?.getId() === id) {
				return true;
			}

			return false;
		});
	}

	getConnectorsByItemIds(
		startPointerItemId?: string,
		endPointerItemId?: string,
	): Connector[] {
		if (!startPointerItemId && !endPointerItemId) {
			return [];
		}
		return this.listAll().filter(item => {
			if (item.itemType !== "Connector" || !item.isConnected()) {
				return false;
			}
			const { startItem, endItem } = item.getConnectedItems();
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
			if (
				startPointerItemId &&
				startItem &&
				startItem.getId() === startPointerItemId
			) {
				return true;
			}
			if (
				endPointerItemId &&
				endItem &&
				endItem.getId() === endPointerItemId
			) {
				return true;
			}
			return false;
		}) as Connector[];
	}

	render(context: DrawingContext): void {
		const frames = this.getFramesInView();
		const rest = this.getItemsInView();

		frames.forEach(frame => frame.renderPath(context)); // background of frames
		rest.forEach(item => item.render(context)); // non-frame items
		frames.forEach(frame => frame.renderBorders(context)); // borders of frames
		frames.forEach(frame => frame.renderName(context)); // names of frames
	}

	renderHTML(): string {
		const frames = this.getFramesInView();
		const rest = this.getItemsInView();
		return this.getHTML(frames, rest);
	}

	getWholeHTML(): string {
		const frames = this.listFrames();
		const rest = this.listAll();
		return this.getHTML(frames, rest);
	}

	getHTML(frames: Frame[], rest: ItemWoFrames[]): string {
		const lowestCoordinates = [...frames, ...rest]
			.map(item => item.getMbr())
			.reduce(
				(acc, mbr) => ({
					left: Math.min(acc.left, mbr.left),
					top: Math.min(acc.top, mbr.top),
				}),
				{ left: 0, top: 0 },
			);

		const childrenMap = new Map<string, string>();
		const framesHTML = frames.map(frame => {
			frame
				.getChildrenIds()
				.forEach(childId => childrenMap.set(childId, frame.getId()));

			const html = frame.renderHTML();
			translateElementBy(
				html,
				-lowestCoordinates.left,
				-lowestCoordinates.top,
			);

			return html;
		});
		const restHTML = rest
			.map(item => "renderHTML" in item && item.renderHTML())
			.filter(item => !!item)
			.map(item => {
				if (item.tagName.toLowerCase() === "connector-item") {
					const startX = parseFloat(
						item.getAttribute("data-start-point-x") || "0",
					);
					const startY = parseFloat(
						item.getAttribute("data-start-point-y") || "0",
					);
					const endX = parseFloat(
						item.getAttribute("data-end-point-x") || "0",
					);
					const endY = parseFloat(
						item.getAttribute("data-end-point-y") || "0",
					);

					item.setAttribute(
						"data-start-point-x",
						(startX - lowestCoordinates.left).toString(),
					);
					item.setAttribute(
						"data-start-point-y",
						(startY - lowestCoordinates.top).toString(),
					);
					item.setAttribute(
						"data-end-point-x",
						(endX - lowestCoordinates.left).toString(),
					);
					item.setAttribute(
						"data-end-point-y",
						(endY - lowestCoordinates.top).toString(),
					);
				}
				return translateElementBy(
					item,
					-lowestCoordinates.left,
					-lowestCoordinates.top,
				);
			});

		for (const item of restHTML) {
			const parentFrameId = childrenMap.get(item.id);
			const frame = framesHTML.find(
				el => parentFrameId !== undefined && el.id === parentFrameId,
			);
			if (frame) {
				positionRelatively(item, frame);
				frame.appendChild(item);
			}
		}

		let result = "";
		for (const frame of framesHTML) {
			result += frame.outerHTML;
		}
		for (const item of restHTML) {
			if (!childrenMap.get(item.id)) {
				result += item.outerHTML;
			}
		}
		return result;
	}
}
