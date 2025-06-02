import { assert } from 'chai';
import { Point } from 'Items';
import { Matrix } from './Matrix';

describe('to transform points, a user', () => {
	it('applies matrix to a point', () => {
		const point = new Point(10, 10);
		const matrix = new Matrix(10, 10, 2, 2);
		matrix.apply(point);
		assert.equal(point.x, 30);
		assert.equal(point.y, 30);
	});
	it('applies inverse matrix to a point', () => {
		const point = new Point(20, 20);
		const matrix = new Matrix(10, 10, 2, 2);
		matrix.invert();
		matrix.apply(point);
		assert.equal(point.x, 5);
		assert.equal(point.y, 5);
	});
});
