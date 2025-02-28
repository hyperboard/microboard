export interface DocumentFactory {
	createElement(tagName: string): HTMLElement;
	createElementNS(namespace: string, tagName: string): Element;
	// Add other document methods as needed
}
