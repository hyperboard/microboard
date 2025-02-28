import { JSDOM } from "jsdom"; // Example dependency for Node
import { DocumentFactory } from "./DocumentFactory";

export class NodeDocumentFactory implements DocumentFactory {
	private dom = new JSDOM().window.document;

	createElement(tagName: string): HTMLElement {
		return this.dom.createElement(tagName);
	}

	createElementNS(namespace: string, tagName: string): Element {
		return this.dom.createElementNS(namespace, tagName);
	}
}
