export class ItemsCounter {
	private static itemIdCounter = 0;

	static getNextItemId(): number {
		return ++ItemsCounter.itemIdCounter;
	}

	static setLastItemId(itemId: number): void {
		ItemsCounter.itemIdCounter = itemId;
	}
}
