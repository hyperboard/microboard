import { describe, it, expect } from 'bun:test';
import { Point } from 'Items';
import { Matrix } from './Matrix';

describe('to transform points, a user', () => {
	it('applies matrix to a point', () => {
		const point = new Point(10, 10);
		const matrix = new Matrix(10, 10, 2, 2);
		matrix.apply(point);
		expect(point.x).toBe(30);
		expect(point.y).toBe(30);
	});
	it('applies inverse matrix to a point', () => {
		const point = new Point(20, 20);
		const matrix = new Matrix(10, 10, 2, 2);
		matrix.invert();
		matrix.apply(point);
		expect(point.x).toBe(5);
		expect(point.y).toBe(5);
	});
});
