import { DocumentFactory } from "./DocumentFactory";

export class BrowserDocumentFactory implements DocumentFactory {
	createElement(tagName: string): HTMLElement {
		return document.createElement(tagName);
	}

	createElementNS(namespace: string, tagName: string): Element {
		return document.createElementNS(namespace, tagName);
	}
}
