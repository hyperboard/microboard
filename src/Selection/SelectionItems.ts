import { Item, Mbr } from "../Items";

export class SelectionItems {
	private items: { [key: string]: Item } = {};

	add(value: Item | Item[]): void {
		if (Array.isArray(value)) {
			for (const item of value) {
				this.items[item.getId()] = item;
			}
		} else {
			this.items[value.getId()] = value;
		}
	}

	remove(value: Item | Item[]): void {
		if (Array.isArray(value)) {
			for (const item of value) {
				delete this.items[item.getId()];
			}
		} else {
			delete this.items[value.getId()];
		}
	}

	removeAll(): void {
		for (const key in this.items) {
			delete this.items[key];
		}
	}

	findById(itemId: string): Item {
		return this.items[itemId];
	}

	list(): Item[] {
		const items = [];
		for (const key in this.items) {
			items.push(this.items[key]);
		}
		return items;
	}

	isEmpty(): boolean {
		return this.list().length === 0;
	}

	isSingle(): boolean {
		return this.list().length === 1;
	}

	isTexts(): boolean {
		if (this.isEmpty()) {
			return false;
		}
		for (const key in this.items) {
			if (this.items[key].itemType !== "RichText") {
				return false;
			}
		}
		return true;
	}

	isItemTypes(itemTypes: string[]): boolean {
		if (this.isEmpty()) {
			return false;
		}
		for (const key in this.items) {
			if (itemTypes.indexOf(this.items[key].itemType) === -1) {
				return false;
			}
		}
		return true;
	}

	getItemTypes(): string[] {
		const itemTypes = [];
		for (const key in this.items) {
			const itemType = this.items[key].itemType;
			if (itemTypes.indexOf(itemType) === -1) {
				itemTypes.push(itemType);
			}
		}
		return itemTypes;
	}

	getItemsByItemTypes(itemTypes: string[]): Item[] {
		const items = [];
		for (const key in this.items) {
			if (itemTypes.indexOf(this.items[key].itemType) > -1) {
				items.push(this.items[key]);
			}
		}
		return items;
	}

	getIdsByItemTypes(itemTypes: string[]): string[] {
		const ids = [];
		const items = this.getItemsByItemTypes(itemTypes);
		for (const item of items) {
			ids.push(item.getId());
		}
		return ids;
	}

	getSingle(): Item | undefined {
		const list = this.list();
		return list.length === 1 ? list[0] : undefined;
	}

	listByIds(itemIdList: string[]): Item[] {
		const items = [];
		for (const key in this.items) {
			if (itemIdList.indexOf(key) > -1) {
				items.push(this.items[key]);
			}
		}
		return items;
	}

	ids(): string[] {
		return Object.keys(this.items);
	}

	getMbr(): Mbr | undefined {
		const list = this.list();
		if (list.length === 0) {
			return;
		}
		const mbr = list[0].getMbr();
		for (let i = 1, len = list.length; i < len; i++) {
			mbr.combine(list[i].getMbr());
		}
		return mbr;
	}
}
