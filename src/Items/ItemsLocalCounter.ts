export class ItemsLocalCounter {
	private static itemIdCounter = 1;

	static getNextId(): number {
		return ItemsLocalCounter.itemIdCounter++;
	}
}
