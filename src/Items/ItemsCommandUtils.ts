import { Item } from "./Item";

export function reverMapOf<Itm extends Item, T>(
	item: Itm | Itm[],
	getCallback: (item: Itm) => T | null | false | undefined,
): { [key: string]: T } {
	const revertMap: { [key: string]: T } = {};
	const items = Array.isArray(item) ? item : [item];
	items.forEach(item => {
		const result = getCallback(item);
		if (result !== null && result !== false && result !== undefined) {
			revertMap[item.getId()] = result;
		}
	});
	return revertMap;
}

export function mapItemsByOperation<Item, O>(
	item: Item | Item[],
	getCallback: (item: Item) => O,
): { item: Item; operation: O }[] {
	const items = Array.isArray(item) ? item : [item];
	return items.map(item => {
		const operation = getCallback(item);
		return { item, operation };
	});
}
