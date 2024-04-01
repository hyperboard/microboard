import { Item, ItemData, Mbr } from "../Items";

export class SelectionItems {
	private items: Map<string, Item> = new Map<string, Item>();

	add(value: Item | Item[]): void {
		if (Array.isArray(value)) {
			value.forEach(item => this.items.set(item.getId(), item));
		} else {
			this.items.set(value.getId(), value);
		}
	}

	remove(value: Item | Item[]): void {
		if (Array.isArray(value)) {
			value.forEach(item => this.items.delete(item.getId()));
		} else {
			this.items.delete(value.getId());
		}
	}

	removeAll(): void {
		this.items.clear();
	}

	findById(itemId: string): Item | null {
		return this.items.get(itemId) || null;
	}

	list(): Item[] {
		return Array.from(this.items.values());
	}

	copy(): Record<string, ItemData> {
		const copyObject: Record<string, ItemData> = {};
		this.items.forEach((item, id) => {
			copyObject[id] = item.serialize();
		});
		return copyObject;
	}

	isEmpty(): boolean {
		return this.items.size === 0;
	}

	isSingle(): boolean {
		return this.items.size === 1;
	}

	values() {
		return this.items.values();
	}

	getSize(): number {
		return this.items.size;
	}

	isTexts(): boolean {
		if (this.isEmpty()) {
			return false;
		}
		for (const item of this.items.values()) {
			if (item.itemType !== "RichText") {
				return false;
			}
		}
		return true;
	}

	isItemTypes(itemTypes: string[]): boolean {
		if (this.isEmpty()) {
			return false;
		}
		for (const item of this.items.values()) {
			if (!itemTypes.includes(item.itemType)) {
				return false;
			}
		}
		return true;
	}

	getItemTypes(): string[] {
		const itemTypes = new Set<string>();
		this.items.forEach(item => itemTypes.add(item.itemType));
		return Array.from(itemTypes);
	}

	getItemsByItemTypes(itemTypes: string[]): Item[] {
		return Array.from(this.items.values()).filter(item =>
			itemTypes.includes(item.itemType),
		);
	}

	getIdsByItemTypes(itemTypes: string[]): string[] {
		const ids: string[] = [];
		this.items.forEach((item, id) => {
			if (itemTypes.includes(item.itemType)) {
				ids.push(id);
			}
		});
		return ids;
	}

	getSingle(): Item | undefined {
		return this.isSingle() ? this.items.values().next().value : undefined;
	}

	listByIds(itemIdList: string[]): Item[] {
		return itemIdList
			.map(id => this.items.get(id))
			.filter(item => item !== undefined);
	}

	ids(): string[] {
		return Array.from(this.items.keys());
	}

	getMbr(): Mbr | undefined {
		const items = this.list();
		if (items.length === 0) return;
		const mbr = items[0].getMbr();
		items.slice(1).forEach(item => mbr.combine(item.getMbr()));
		return mbr;
	}
}
