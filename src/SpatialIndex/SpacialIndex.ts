import { DocumentFactory } from 'api/DocumentFactory';
import { ItemsIndexRecord } from 'BoardOperations';
import { Camera } from 'Camera';
import { translateElementBy, positionRelatively } from 'HTMLRender';
import {Item, Frame, Mbr, ItemData, Point, Connector, Comment, Shape} from 'Items';
import { DrawingContext } from 'Items/DrawingContext';
import { Pointer } from 'Pointer';
import { conf } from 'Settings';
import { Subject } from 'Subject';
import { LayeredIndex } from './LayeredIndex';
import {BaseItem} from "../Items/BaseItem";
import {ItemDataWithId} from "../Items/Item";

export class SpatialIndex {
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
		this.itemsIndex.remove(item);

		this.Mbr = new Mbr();
		this.itemsArray.forEach(item => this.Mbr.combine([item.getMbr()]));

		this.subject.publish(this.items);
	}

	copy(): ItemDataWithId[] {
		return this.getItemsWithIncludedChildren(this.itemsArray).map(item => ({
			...item.serialize(true),
			id: item.getId(),
		}));
	}

	getItemsWithIncludedChildren(items: Item[]): Item[] {
		return items.flatMap(item => {
			if ("index" in item && item.index) {
				return [item, ...item.index.list()];
			}
			return item;
		});
	}

	getItemChildren(item: Item): Item[] {
		if ("index" in item && item.index) {
			return item.index.list();
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
		this.itemsIndex.change(item);
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
		this.itemsIndex.change(item);
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

	// TODO Item could be frame
	moveSecondAfterFirst(first: Item, second: Item): void {
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

	getEnclosed(left: number, top: number, right: number, bottom: number): Item[] {
		const mbr = new Mbr(left, top, right, bottom);
		const items = this.itemsIndex.getEnclosed(mbr);
		const children: Item[] = [];
		items.forEach((item: Item) => {
			const children = this.getItemChildren(item);
			children.forEach((child: Item) => {
				if (child.isEnclosedBy(mbr)) {
					children.push(child);
				}
			})
		})
		console.log([...items, ...children])
		return [...items, ...children];
	}

	getEnclosedOrCrossed(left: number, top: number, right: number, bottom: number): Item[] {
		const mbr = new Mbr(left, top, right, bottom);
		const items = this.itemsIndex.getEnclosedOrCrossedBy(mbr);
		const children: Item[] = [];
		items.forEach((item: Item) => {
			const children = this.getItemChildren(item);
			children.forEach((child: Item) => {
				if (child.isEnclosedOrCrossedBy(mbr)) {
					children.push(child);
				}
			})
		})
		console.log([...items, ...children])
		return [...items, ...children];
	}

	getUnderPoint(point: Point, tolerance = 5): Item[] {
		const items = this.itemsIndex.getUnderPoint(point, tolerance);
		const children: Item[] = [];
		items.forEach((item: Item) => {
			const children = this.getItemChildren(item);
			children.forEach((child: Item) => {
				if (child.isUnderPoint(point, tolerance)) {
					children.push(child);
				}
			})
		})
		console.log([...items, ...children])
		return [...items, ...children];
	}

	getRectsEnclosedOrCrossed(left: number, top: number, right: number, bottom: number): Item[] {
		const mbr = new Mbr(left, top, right, bottom);
		const items = this.itemsIndex.getRectsEnclosedOrCrossedBy(mbr);
		const children: Item[] = [];
		items.forEach((item: Item) => {
			const children = this.getItemChildren(item);
			children.forEach((child: Item) => {
				if (child.isEnclosedOrCrossedBy(mbr)) {
					children.push(child);
				}
			})
		})
		console.log([...items, ...children])
		return [...items, ...children];
	}

	getItemsEnclosedOrCrossed(
		left: number,
		top: number,
		right: number,
		bottom: number
	): Item[] {
		return this.getRectsEnclosedOrCrossed(left, top, right, bottom);
	}

	getComments(): Comment[] {
		return this.itemsArray.filter(item => item instanceof Comment) as Comment[];
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
		const allItems = this.getItemsWithIncludedChildren(this.itemsArray);
		const filtered = allItems.filter(item => filter(item));
		const withDistance = filtered
			.map(item => ({
				item,
				distance: point.getDistance(item.getMbr().getCenter())
			}))
			.filter(({ distance }) => distance <= maxDistance);

		withDistance.sort((a, b) => a.distance - b.distance);
		console.log(withDistance.slice(0, maxItems).map(({ item }) => item))
		return withDistance.slice(0, maxItems).map(({ item }) => item);
	}

	list(): Item[] {
		console.log("list", this.getItemsWithIncludedChildren(this.itemsArray).concat())
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
		public index: SpatialIndex,
		private view: Camera,
		private pointer: Pointer,
		readonly subject: Subject<Items>
	) {}

	update(item: Item): void {
		this.index.change(item);
	}

	listAll(): Item[] {
		return this.index.list();
	}

	listGroupItems(): BaseItem[] {
		return this.index.list().filter(item => "getChildrenIds" in item && item.getChildrenIds());
	}

	getById(id: string): BaseItem | undefined {
		return this.index.getById(id);
	}

	findById(id: string): Item | undefined {
		return this.index.findById(id);
	}

	getEnclosed(left: number, top: number, right: number, bottom: number): Item[] {
		return this.index.getEnclosed(left, top, right, bottom);
	}

	getEnclosedOrCrossed(left: number, top: number, right: number, bottom: number): Item[] {
		return this.index.getEnclosedOrCrossed(left, top, right, bottom);
	}

	getGroupItemsEnclosedOrCrossed(left: number, top: number, right: number, bottom: number): BaseItem[] {
		return this.index.getEnclosedOrCrossed(left, top, right, bottom).filter(item => item instanceof BaseItem && item.getChildrenIds()) as BaseItem[];
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

	getItemsInView(): Item[] {
		const { left, top, right, bottom } = this.view.getMbr();
		return this.index.getItemsEnclosedOrCrossed(left, top, right, bottom);
	}

	getGroupItemsInView(): BaseItem[] {
		const { left, top, right, bottom } = this.view.getMbr();
		return this.getGroupItemsEnclosedOrCrossed(left, top, right, bottom);
	}

	getComments(): Comment[] {
		return this.index.getComments();
	}

	getUnderPointer(size = 0): Item[] {
		const { x, y } = this.pointer.point;
		const unmodifiedSize = size;
		size = 16;
		const tolerated = this.index.getEnclosedOrCrossed(x - size, y - size, x + size, y + size);

		const groups = tolerated.filter(item => item.itemType === 'Group');
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

		if (underPointer.some(item => item.itemType === "Drawing")) {
			enclosed = [...underPointer, ...enclosed];
		}

		const { nearest } = enclosed.reduce(
			(acc, item) => {
				const area = item.getMbr().getHeight() * item.getMbr().getWidth();

				if (item.itemType === "Drawing" && !item.isPointNearLine(this.pointer.point)) {
					return acc;
				}

				const isItemTransparent =
					item instanceof Shape && item?.getBackgroundColor() === 'none';
				const itemZIndex = this.getZIndex(item);
				const accZIndex = this.getZIndex(acc.nearest!);

				if (
					(itemZIndex > accZIndex && (!isItemTransparent || area === acc.area)) ||
					area < acc.area
				) {
					return { nearest: item, area };
				}

				return acc;
			},
			{ nearest: undefined, area: Infinity } as {
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
		return this.index.getNearestTo(this.pointer.point, maxItems, filter, maxDistance);
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
			if (!(item instanceof Connector)) {
				return false;
			}

			const { startItem, endItem } = item.getConnectedItems();
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
			if (!(item instanceof Connector) || !item.isConnected()) {
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
			if (startPointerItemId && startItem && startItem.getId() === startPointerItemId) {
				return true;
			}
			if (endPointerItemId && endItem && endItem.getId() === endPointerItemId) {
				return true;
			}
			return false;
		}) as Connector[];
	}

	render(context: DrawingContext): void {
		const items = this.getItemsInView();

		items.forEach(item => {
			if (item.parent === "Board") {
				item.render(context);
			}
		})
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
				{ left: 0, top: 0 }
			);

		const groups: BaseItem[] = []
		const rest: Item[] = []

		items.forEach(item => {
			if ("index" in item && item.index) {
				groups.push(item)
			} else {
				rest.push(item)
			}
		})

		const childrenMap = new Map<string, string>();
		const GroupsHTML = groups.map(group => {
			group.getChildrenIds().forEach(childId => childrenMap.set(childId, group.getId()));

			const html = group.renderHTML(documentFactory);
			translateElementBy(html, -lowestCoordinates.left, -lowestCoordinates.top);

			return html;
		});
		const restHTML = rest
			.map(item => 'renderHTML' in item && item.renderHTML(documentFactory))
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
				return translateElementBy(item, -lowestCoordinates.left, -lowestCoordinates.top);
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
