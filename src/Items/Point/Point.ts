import { toFiniteNumber } from 'lib';
import { Matrix } from '..';

export class Point {
	constructor(public x = 0, public y = 0) {
		this.x = toFiniteNumber(x);
		this.y = toFiniteNumber(y);
	}

	getDistance(point: Point): number {
		const deltaX = this.x - point.x;
		const deltaY = this.y - point.y;
		return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
	}

	transform(matrix: Matrix): void {
		matrix.apply(this);
	}

	getTransformed(matrix: Matrix): Point {
		const point = new Point(this.x, this.y);
		matrix.apply(point);
		return point;
	}

	copy(): Point {
		return new Point(this.x, this.y);
	}

	equal(point: Point): boolean {
		return this.x === point.x && this.y === point.y;
	}

	barelyEqual(point: Point): boolean {
		return (
			this.equal(point) ||
			(Math.abs(this.x - point.x) < 0.01 && Math.abs(this.y - point.y) < 0.01)
		);
	}
}
