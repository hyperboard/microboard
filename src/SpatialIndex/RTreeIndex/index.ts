import RBush, { BBox } from "rbush";
import knn from "rbush-knn";
import { Point, Mbr } from "Board/Items";
import { Item } from "Board/Items";
import { Container } from "../LayeredIndex";

/* 
RBush can not remove a rectangle if its bounds were changed. 
So all items need to be inside of containers. 
See https://github.com/mourner/rbush/issues/95. 
*/

class Tree extends RBush<Container> {
	toBBox(container: Container): BBox {
		const { left, top, right, bottom } = container;
		return {
			minX: left,
			minY: top,
			maxX: right,
			maxY: bottom,
		};
	}

	compareMinX(containerA: Container, containerB: Container): number {
		return containerA.left - containerB.left;
	}

	compareMinY(containerA: Container, containerB: Container): number {
		return containerA.top - containerB.top;
	}
}

export class RTreeIndex {
	tree = new Tree();
	map = new Map<string, Container>();

	insert(container: Container): void {
		this.map.set(container.id, container);
		this.tree.insert(container);
	}

	change(container: Container): void {
		const oldContainer = this.map.get(container.id);
		if (oldContainer) {
			this.tree.remove(oldContainer);
		}
		this.map.set(container.id, container);
		this.tree.insert(container);
	}

	get(id: string): Item | undefined {
		const container = this.map.get(id);
		return container ? container.item : undefined;
	}

	remove(id: string): void {
		const item = this.map.get(id);
		if (item) {
			this.map.delete(id);
			this.tree.remove(item);
		}
		// to find an item and remove it
		// this.tree.remove (item, (a, b) => {
		//    return a.id === b.id;
		// });
	}

	list(): Item[] {
		const containers = this.tree.all();
		const items = [];
		for (const container of containers) {
			items.push(container.item);
		}
		return items;
	}

	getEnclosed(rect: Mbr): Item[] {
		return this.tree
			.search({
				minX: rect.left,
				minY: rect.top,
				maxX: rect.right,
				maxY: rect.bottom,
			})
			.filter(container => container.item.isEnclosedBy(rect))
			.map(container => container.item);
	}

	getEnclosedOrCrossedBy(rect: Mbr): Item[] {
		return this.tree
			.search({
				minX: rect.left,
				minY: rect.top,
				maxX: rect.right,
				maxY: rect.bottom,
			})
			.filter(container => container.item.isEnclosedOrCrossedBy(rect))
			.map(container => container.item);
		/*
		const containers = this.tree.search({
			minX: rect.left,
			minY: rect.top,
			maxX: rect.right,
			maxY: rect.bottom,
		});
		const items = [];
		for (const container of containers) {
			if (container.item.isEnclosedOrCrossedBy(rect)) {
				items.push(container.item);
			}
		}
		return items;
		*/
	}

	getUnderPoint(point: Point, tolerance = 5): Item[] {
		return this.tree
			.search({
				minX: point.x,
				minY: point.y,
				maxX: point.x,
				maxY: point.y,
			})
			.filter(container => container.item.isUnderPoint(point, tolerance))
			.map(container => container.item);
	}

	getRectsEnclosedOrCrossedBy(rect: Mbr): Item[] {
		return this.tree
			.search({
				minX: rect.left,
				minY: rect.top,
				maxX: rect.right,
				maxY: rect.bottom,
			})
			.map(container => container.item);
		/*
		const rectangles = this.tree.search({
			minX: rect.left,
			minY: rect.top,
			maxX: rect.right,
			maxY: rect.bottom,
		});
		const items = [];
		for (const rectangle of rectangles) {
			items.push(rectangle.item);
		}
		return items;
		*/
	}

	isAnyEnclosedOrCrossedBy(rect: Mbr): boolean {
		return this.tree.collides({
			minX: rect.left,
			minY: rect.top,
			maxX: rect.right,
			maxY: rect.bottom,
		});
	}

	getNearestTo(
		point: Point,
		maxItems: number,
		filter: (item: Item) => boolean,
		maxDistance: number,
	): Item[] {
		return knn<Container>(
			this.tree,
			point.x,
			point.y,
			maxItems,
			container => filter(container.item),
			maxDistance,
		).map(container => container.item);
		/*
		function containerFilter(container: Container): boolean {
			return filter(container.item);
		}
		const { x, y } = point;
		const items = [];
		const containers = knn<Container>(
			this.tree,
			x,
			y,
			maxItems,
			containerFilter,
			maxDistance,
		);
		for (const container of containers) {
			items.push(container.item);
		}
		return items;
		*/
	}

	batchInsert(batch: Container[]): void {
		for (const one of batch) {
			this.insert(one);
		}
	}

	batchChange(batch: Container[]): void {
		for (const one of batch) {
			this.change(one);
		}
	}
}
