/* eslint-disable id-length */
// import { Path2D as CanvasPath2D } from "skia-canvas";
// import { Path2D as CanvasPath2D } from "canvas";
// import { CanvasRenderingContext2D as CanvasPath2D } from "canvas";
// import { Canvas } from "canvas";
import { Path2DFactory } from "./Path2DFactory";

export class NodePath2D extends Path2DFactory {
	// nativePath: CanvasPath2D;
	nativePath = {};
	private shouldLog = false;
	private log(str: string) {
		if (this.shouldLog) {
			console.log(str);
		}
	}

	constructor(d?: string) {
		super();
		this.log("DummyPath2D constructor called");
	}

	addPath(path: Path2DFactory, transform?: DOMMatrix2DInit): void {
		this.log("addPath called");
	}

	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean,
	): void {
		this.log("arc called");
	}

	arcTo(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		radius: number,
	): void {
		this.log("arcTo called");
	}

	bezierCurveTo(
		cp1x: number,
		cp1y: number,
		cp2x: number,
		cp2y: number,
		x: number,
		y: number,
	): void {
		this.log("bezierCurveTo called");
	}

	closePath(): void {
		this.log("closePath called");
	}

	ellipse(
		x: number,
		y: number,
		radiusX: number,
		radiusY: number,
		rotation: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean,
	): void {
		this.log("ellipse called");
	}

	lineTo(x: number, y: number): void {
		this.log("lineTo called");
	}

	moveTo(x: number, y: number): void {
		this.log("moveTo called");
	}

	quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
		this.log("quadraticCurveTo called");
	}

	rect(x: number, y: number, w: number, h: number): void {
		this.log("rect called");
	}

	// Expose a dummy method for getNativePath
	getNativePath(): void {
		this.log("getNativePath called");
	}

	roundRect(
		x: number,
		y: number,
		width: number,
		height: number,
		radii?: number | DOMPointInit,
	): void {
		this.log("roundRect called");
		// this.nativePath.roundRect(x, y, width, height, radii);
	}
}
