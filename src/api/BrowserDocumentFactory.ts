import { DocumentFactory } from "./DocumentFactory";

export class BrowserDocumentFactory implements DocumentFactory {
	createElement(tagName: string): HTMLElement {
		return document.createElement(tagName);
	}

	createElementNS(namespace: string, tagName: string): Element {
		return document.createElementNS(namespace, tagName);
	}

	caretPositionFromPoint(
		x: number,
		y: number,
		options?: CaretPositionFromPointOptions,
	): CaretPosition | null {
		return document.caretPositionFromPoint(x, y, options);
	}

	caretRangeFromPoint(x: number, y: number): Range | null {
		return document.caretRangeFromPoint(x, y);
	}
}
