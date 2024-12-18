import { toFiniteNumber } from "utils";
import { Point } from "..";

export class Matrix {
	constructor(
		public translateX = 0,
		public translateY = 0,
		public scaleX = 1,
		public scaleY = 1,
		public shearX = 0,
		public shearY = 0,
	) {
		this.translateX = toFiniteNumber(translateX);
		this.translateY = toFiniteNumber(translateY);
		this.scaleX = toFiniteNumber(scaleX, 1);
		this.scaleY = toFiniteNumber(scaleY, 1);
		this.shearX = toFiniteNumber(shearX);
		this.shearY = toFiniteNumber(shearY);
	}

	translate(x: number, y: number): void {
		// this.translateX = this.scaleX * x + this.shearX * y + this.translateX;
		// this.translateY = this.scaleY * y + this.shearY * x + this.translateY;
		this.translateX += x;
		this.translateY += y;
	}

	scale(x: number, y: number): void {
		this.scaleX = this.scaleX * x;
		this.scaleY = this.scaleY * y;
	}

	multiplyByMatrix(matrix: Matrix): this {
		const { translateX, translateY, scaleX, scaleY, shearX, shearY } = this;
		this.translateX =
			scaleX * matrix.translateX +
			shearX * matrix.translateY +
			translateX;
		this.translateY =
			shearY * matrix.translateX +
			scaleY * matrix.translateY +
			translateY;
		this.scaleX = scaleX * matrix.scaleX + shearX * matrix.shearY;
		this.scaleY = shearY * matrix.shearX + scaleY * matrix.scaleY;
		this.shearX = scaleX * matrix.shearX + shearX * matrix.scaleY;
		this.shearY = shearY * matrix.scaleX + scaleY * matrix.shearY;
		return this;
	}

	multiplyByMatrixies(matrixies: Matrix[]): this {
		for (const matrix of matrixies) {
			this.multiplyByMatrix(matrix);
		}
		return this;
	}

	multiply(value: Matrix | Matrix[]): this {
		if (Array.isArray(value)) {
			this.multiplyByMatrixies(value);
		} else {
			this.multiplyByMatrix(value);
		}
		return this;
	}

	copy(): Matrix {
		return new Matrix(
			this.translateX,
			this.translateY,
			this.scaleX,
			this.scaleY,
			this.shearX,
			this.shearY,
		);
	}

	// Invert the matrix
	invert(): void {
		// http://www.wolframalpha.com/input/?i=Inverse+%5B%7B%7Ba,c,e%7D,%7Bb,d,f%7D,%7B0,0,1%7D%7D%5D
		const { scaleX, shearY, shearX, scaleY, translateX, translateY } = this;

		const denom = scaleX * scaleY - shearX * shearY;

		this.scaleX = scaleY / denom;
		this.shearY = shearY / -denom;
		this.shearX = shearX / -denom;
		this.scaleY = scaleX / denom;
		this.translateX = (scaleY * translateX - shearX * translateY) / -denom;
		this.translateY = (shearY * translateX - scaleX * translateY) / denom;
	}

	// Get the inverse matrix
	getInverse(): Matrix {
		const inverse = this.copy();
		inverse.invert();
		return inverse;
	}

	// Rotate by radian
	rotateByRadian(radian: number): Matrix {
		const cosAngle = Math.cos(radian);
		const sinAngle = Math.sin(radian);
		const rotationMatrix = new Matrix(
			0,
			0,
			cosAngle,
			cosAngle,
			-sinAngle,
			sinAngle,
		);
		return this.multiply(rotationMatrix);
	}

	// Rotate by degree
	rotateBy(degree: number): void {
		const radian = (degree * Math.PI) / 180;
		this.rotateByRadian(radian);
	}

	rotateByObjectCenter(
		degree: number,
		size: { width: number; height: number },
		scale: {
			x: number;
			y: number;
		},
	): void {
		const angle = degree * (Math.PI / 180);
		const width = size.width * scale.x;
		const height = size.height * scale.y;
		const centerX = width / 2;
		const centerY = height / 2;

		const x =
			centerX - (centerX * Math.cos(angle) - centerY * Math.sin(angle));
		const y =
			centerY - (centerX * Math.sin(angle) + centerY * Math.cos(angle));
		this.rotateBy(degree);
		this.translate(x, y);
	}

	// Rotate by degree relative to a point
	rotateByRelativeTo(degree: number, x: number, y: number): void {
		this.translateX += x;
		this.translateY += y;
		this.rotateBy(degree);
		this.translateX -= x;
		this.translateY -= y;
	}

	// Rotate by radian relative to a point
	rotateByRadianRelativeTo(radian: number, x: number, y: number): void {
		this.translateX += x;
		this.translateY += y;
		this.rotateByRadian(radian);
		this.translateX -= x;
		this.translateY -= y;
	}

	apply(point: Point): void {
		const { x, y } = point;
		point.x = this.scaleX * x + this.shearX * y + this.translateX;
		point.y = this.shearY * x + this.scaleY * y + this.translateY;
	}

	applyToContext(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	): void {
		ctx.transform(
			this.scaleX,
			this.shearY,
			this.shearX,
			this.scaleY,
			this.translateX,
			this.translateY,
		);
	}

	getAffineMatrix(): {
		a: number;
		b: number;
		c: number;
		d: number;
		e: number;
		f: number;
	} {
		return {
			a: this.scaleX,
			b: this.shearY,
			c: this.shearX,
			d: this.scaleY,
			e: this.translateX,
			f: this.translateY,
		};
	}

	getCssString(): string {
		return `matrix(${this.scaleX},${this.shearY},${this.shearX},${this.scaleY},${this.translateX},${this.translateY})`;
	}

	identity(): Matrix {
		return new Matrix();
	}

	mirrorOrigin(): Matrix {
		return new Matrix(0, 0, -1, -1);
	}

	mirrorX(): Matrix {
		return new Matrix(0, 0, 1, -1);
	}

	mirrorY(): Matrix {
		return new Matrix(0, 0, -1, 1);
	}

	compare(matrix: Matrix): boolean {
		const { translateX, translateY, scaleX, scaleY, shearX, shearY } =
			matrix;
		return (
			this.translateX === translateX &&
			this.translateY === translateY &&
			this.scaleX === scaleX &&
			this.scaleY === scaleY &&
			this.shearX === shearX &&
			this.shearY === shearY
		);
	}
}
