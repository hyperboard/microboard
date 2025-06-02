/* eslint-disable id-length */
// import { Path2D as CanvasPath2D } from "skia-canvas";
// import { Path2D as CanvasPath2D } from "canvas";
// import { CanvasRenderingContext2D as CanvasPath2D } from "canvas";
// import { Canvas } from "canvas";
import { Path2DFactory } from './Path2DFactory';

export class NodePath2D extends Path2DFactory {
	nativePath = {};

	constructor(d?: string) {
		super();
	}

	addPath(path: Path2DFactory, transform?: DOMMatrix2DInit): void {}

	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean
	): void {}

	arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {}

	bezierCurveTo(
		cp1x: number,
		cp1y: number,
		cp2x: number,
		cp2y: number,
		x: number,
		y: number
	): void {}

	closePath(): void {}

	ellipse(
		x: number,
		y: number,
		radiusX: number,
		radiusY: number,
		rotation: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean
	): void {}

	lineTo(x: number, y: number): void {}

	moveTo(x: number, y: number): void {}

	quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {}

	rect(x: number, y: number, w: number, h: number): void {}

	// Expose a dummy method for getNativePath
	getNativePath(): void {}

	roundRect(
		x: number,
		y: number,
		width: number,
		height: number,
		radii?: number | DOMPointInit
	): void {}
}
