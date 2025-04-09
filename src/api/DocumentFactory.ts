export interface DocumentFactory {
	createElement(tagName: string): HTMLElement;
	createElementNS(namespace: string, tagName: string): Element;
	caretPositionFromPoint(
		x: number,
		y: number,
		options?: CaretPositionFromPointOptions,
	): CaretPosition | null;
	caretRangeFromPoint(x: number, y: number): Range | null;
	// Add other document methods as needed
}
