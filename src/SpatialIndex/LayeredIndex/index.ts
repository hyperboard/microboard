import { Mbr, Point } from 'Items';
import { Item } from 'Items';
import { Layers } from './Layers';
import { getContainersSortedByZIndex } from './getContainersSortedByZIndex';
import { RTreeIndex } from '../RTreeIndex';
export class Container extends Mbr {
	constructor(public id: string, public item: Item, public layer: number, public zIndex: number) {
		const rect = item.getMbr();
		super(rect.left, rect.top, rect.right, rect.bottom);
	}
}

export class LayeredIndex<T extends Item> {
	// export class LayeredIndex {
	map = new Map<string, Container>();
	layers = new Layers(() => {
		return new RTreeIndex();
	});

	constructor(private getZIndex: (item: T) => number) {
		// constructor(private getZIndex: (item: Item) => number) {
		this.getZIndex = this.getZIndex.bind(this);
		this.layers.newOnTop();
	}

	private isT(item: Item): item is T {
		return true;
	}

	findById(id: string): Item | undefined {
		const container = this.map.get(id);
		return container ? container.item : undefined;
	}

	getEnclosed(rect: Mbr): Item[] {
		let items: Item[] = [];
		for (const layer of this.layers.array) {
			items = items.concat(layer.getEnclosed(rect));
		}
		return items;
	}

	getEnclosedOrCrossedBy(rect: Mbr): Item[] {
		let items: Item[] = [];
		for (const layer of this.layers.array) {
			items = items.concat(layer.getEnclosedOrCrossedBy(rect));
		}
		return items;
	}

	getUnderPoint(point: Point, tolerance = 5): Item[] {
		let items: Item[] = [];
		for (const layer of this.layers.array) {
			const layerItems = layer.getUnderPoint(point, tolerance);
			if (layerItems.length > 0) {
				items = items.concat(layerItems);
			}
		}
		return items;
	}

	getRectsEnclosedOrCrossedBy(rect: Mbr): T[] {
		const items: Container[] = [];
		const minMax = {
			minX: rect.left,
			minY: rect.top,
			maxX: rect.right,
			maxY: rect.bottom,
		};
		for (const layer of this.layers.array) {
			const layerRects = layer.tree.search(minMax);
			if (layerRects.length > 0) {
				Array.prototype.push.apply(items, layerRects);
			}
		}
		return items.map(container => container.item as T);
		/*
		const items: Item[] = [];

		for (const layer of this.layers.array) {
			const layerRects = layer.getRectsEnclosedOrCrossedBy(rect);
			if (layerRects.length > 0) {
				Array.prototype.push.apply(items, layerRects);
			}
		}
		return items;
		*/
		/*
		let items: Item[] = [];
		for (const layer of this.layers) {
			items = items.concat(layer.getRectsEnclosedOrCrossedBy(rect));
		}
		return items;
		*/
	}

	isAnyEnclosedOrCrossedBy(rect: Mbr): boolean {
		for (const layer of this.layers.array) {
			if (layer.isAnyEnclosedOrCrossedBy(rect)) {
				return true;
			}
		}
		return false;
	}

	getNearestTo(
		point: Point,
		maxItems: number,
		filter: (item: Item) => boolean,
		maxDistance: number
	): Item[] {
		let items: Item[] = [];
		for (const layer of this.layers.array) {
			items = items.concat(layer.getNearestTo(point, maxItems, filter, maxDistance));
		}
		return items;
	}

	private getContainersFromItems(items: Item[]): Container[] {
		const containers: Container[] = [];
		for (const item of items) {
			const container = this.map.get(item.getId());
			if (container) {
				containers.push(container);
			}
		}
		return containers;
	}

	insertContainer(container: Container): void {
		this.remove(container.item);
		while (container.layer > this.layers.getTop()) {
			this.layers.newOnTop();
		}
		while (container.layer < this.layers.getBottom()) {
			this.layers.newOnBottom();
		}
		const layer = this.layers.get(container.layer);
		if (layer) {
			layer.insert(container);
			this.map.set(container.id, container);
		}
	}

	shiftContainerAbove(container: Container, layer: number): void {
		if (!this.isT(container.item)) {
			return;
		}
		const bounds = container.item.getMbr();
		this.remove(container.item);
		const inBounds = this.getRectsEnclosedOrCrossedBy(bounds);
		const containersInBounds = this.getContainersFromItems(inBounds);
		const containersAbove: Container[] = [];
		const containerZIndex = this.getZIndex(container.item);
		for (const one of containersInBounds) {
			if (this.isT(one.item) && this.getZIndex(one.item) > containerZIndex) {
				containersAbove.push(one);
			}
		}
		if (container.layer <= layer) {
			container.layer = layer + 1;
		}
		this.insertContainer(container);
		if (inBounds.length === 0) {
			return;
		}
		for (const one of containersAbove) {
			if (container.layer >= one.layer) {
				this.shiftContainerAbove(one, container.layer);
			}
		}
	}

	shiftContainerBelow(container: Container, layer: number): void {
		if (!this.isT(container.item)) {
			return;
		}
		const bounds = container.item.getMbr();
		this.remove(container.item);
		const inBounds = this.getRectsEnclosedOrCrossedBy(bounds);
		const containersInBounds = this.getContainersFromItems(inBounds);
		const containersBelow: Container[] = [];
		const containerZIndex = this.getZIndex(container.item);
		for (const one of containersInBounds) {
			if (this.isT(one.item) && this.getZIndex(one.item) < containerZIndex) {
				containersBelow.push(one);
			}
		}
		if (container.layer >= layer) {
			container.layer = layer - 1;
		}
		this.insertContainer(container);
		if (inBounds.length === 0) {
			return;
		}
		for (const one of containersBelow) {
			if (container.layer <= one.layer) {
				this.shiftContainerBelow(one, container.layer);
			}
		}
	}

	insert(item: T): void {
		const toInsert = new Container(item.getId(), item, 0, this.getZIndex(item));
		const bounds = item.getMbr();
		const inBounds = this.getRectsEnclosedOrCrossedBy(bounds);

		if (inBounds.length === 0) {
			return this.insertContainer(toInsert);
		}

		const containersInBounds = this.getContainersFromItems(inBounds);
		const containersInBoundsCopy: Container[] = [];
		for (const one of containersInBounds) {
			containersInBoundsCopy.push(new Container(one.id, one.item, one.layer, one.zIndex));
		}

		const containers = containersInBoundsCopy.concat([toInsert]);
		const sorted = getContainersSortedByZIndex(containers);
		const index = sorted.findIndex(container => {
			return container === toInsert;
		});
		const above = containers.length - (index + 1);
		const below = containers.length - (above + 1);
		const containersAbove = containers.slice(index + 1, containers.length);
		const containersBelow = containers.slice(0, index);
		// TODO clean up unnecessery code
		let topLayer = -Number.MAX_VALUE;
		for (const container of containers) {
			if (topLayer < container.layer) {
				topLayer = container.layer;
			}
		}
		let bottomLayer = Number.MAX_VALUE;
		for (const container of containers) {
			if (bottomLayer > container.layer) {
				bottomLayer = container.layer;
			}
		}
		let topLayerBelow = -Number.MAX_VALUE;
		for (const container of containersBelow) {
			if (topLayerBelow < container.layer) {
				topLayerBelow = container.layer;
			}
		}
		let bottomLayerAbove = Number.MAX_VALUE;
		for (const container of containersAbove) {
			if (bottomLayerAbove > container.layer) {
				bottomLayerAbove = container.layer;
			}
		}
		if (above === 0) {
			toInsert.layer = topLayer + 1;
			return this.insertContainer(toInsert);
		} else if (below === 0) {
			toInsert.layer = bottomLayer - 1;
			return this.insertContainer(toInsert);
		} else if (above > below) {
			toInsert.layer = bottomLayerAbove - 1;
			this.insertContainer(toInsert);
			for (const container of containersBelow) {
				if (container.layer >= toInsert.layer) {
					this.shiftContainerBelow(container, toInsert.layer);
				}
			}
		} else {
			toInsert.layer = topLayerBelow + 1;
			this.insertContainer(toInsert);
			for (const container of containersAbove) {
				if (container.layer <= toInsert.layer) {
					this.shiftContainerAbove(container, toInsert.layer);
				}
			}
		}
	}

	change(item: T): void {
		const id = item.getId();
		const container = this.map.get(id);
		if (container) {
			const layer = this.layers.get(container.layer);
			if (layer) {
				layer.remove(id);
				this.map.delete(id);
				this.insert(item);
			}
		}
	}

	remove(item: Item): void {
		const id = item.getId();
		const container = this.map.get(id);
		if (container) {
			const layer = this.layers.get(container.layer);
			if (layer) {
				layer.remove(id);
			}
			this.map.delete(id);
		}
	}

	get(id: string): T | undefined {
		const container = this.map.get(id);
		if (container) {
			return container.item as T;
		} else {
			return undefined;
		}
	}

	list(): T[] {
		const items: T[] = [];
		for (const record of this.map) {
			items.push(record[1].item as T);
		}
		return items;
	}

	batchInsert(items: T[]): void {
		for (const item of items) {
			this.insert(item);
		}
	}

	batchChange(items: T[]): void {
		for (const item of items) {
			this.change(item);
		}
	}
}
