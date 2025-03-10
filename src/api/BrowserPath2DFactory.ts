/* eslint-disable id-length */
import { Path2DFactory } from "./Path2DFactory";

export class BrowserPath2D implements Path2DFactory {
	private nativePath: Path2D;

	constructor(d?: string) {
		this.nativePath = new Path2D(d);
	}

	addPath(path: Path2DFactory, transform?: DOMMatrix2DInit): void {
		if (path instanceof BrowserPath2D) {
			this.nativePath.addPath(path.nativePath, transform);
		} else {
			throw new Error("Invalid Path2D instance passed to addPath.");
		}
	}

	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean,
	): void {
		this.nativePath.arc(x, y, radius, startAngle, endAngle, anticlockwise);
	}

	arcTo(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		radius: number,
	): void {
		this.nativePath.arcTo(x1, y1, x2, y2, radius);
	}

	bezierCurveTo(
		cp1x: number,
		cp1y: number,
		cp2x: number,
		cp2y: number,
		x: number,
		y: number,
	): void {
		this.nativePath.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
	}

	closePath(): void {
		this.nativePath.closePath();
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
		this.nativePath.ellipse(
			x,
			y,
			radiusX,
			radiusY,
			rotation,
			startAngle,
			endAngle,
			anticlockwise,
		);
	}

	lineTo(x: number, y: number): void {
		this.nativePath.lineTo(x, y);
	}

	moveTo(x: number, y: number): void {
		this.nativePath.moveTo(x, y);
	}

	quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
		this.nativePath.quadraticCurveTo(cpx, cpy, x, y);
	}

	rect(x: number, y: number, w: number, h: number): void {
		this.nativePath.rect(x, y, w, h);
	}

	// Expose the native Path2D instance if needed
	getNativePath(): Path2D {
		return this.nativePath;
	}
}
