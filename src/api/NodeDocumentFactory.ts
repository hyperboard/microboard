import { createCanvas, Image } from "canvas";
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

	caretPositionFromPoint(
		x: number,
		y: number,
		options?: CaretPositionFromPointOptions,
	): CaretPosition | null {
		return this.dom.caretPositionFromPoint(x, y, options);
	}

	caretRangeFromPoint(x: number, y: number): Range | null {
		return this.dom.caretRangeFromPoint(x, y);
	}
}

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
// global.document = dom.window.document; // documents are not the same
// global.window = dom.window; // had to comment out, this does not work
global.HTMLImageElement = dom.window.HTMLImageElement;
global.Image = Image; // Use the canvas Image implementation

// Override the Image implementation for Node.js
Image.prototype.onload = function () {};
Image.prototype.onerror = function () {};

// Create canvas context
global.createCanvasContext = (width, height) => {
	const canvas = createCanvas(width, height);
	return canvas.getContext("2d");
};
