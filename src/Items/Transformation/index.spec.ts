import { describe, it, expect } from 'bun:test';
import { Point } from '../Point/Point';
import { Matrix } from './Matrix';
import { Transformation } from './Transformation';
import { transformOps } from './transformOps';

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

	it('updates transformation properties via setLocal', () => {
		const transformation = new Transformation('item-1');

		transformation.apply(transformOps.setLocal(transformation.getId(), { translateX: 10, translateY: 20, scaleX: 2, scaleY: 3 }));

		expect(transformation.getTranslation()).toEqual({ x: 10, y: 20 });
		expect(transformation.getScale()).toEqual({ x: 2, y: 3 });
	});

	it('routes setLocalMatrix through apply and preserves the previous matrix', () => {
		const transformation = new Transformation('item-1');
		transformation.apply(transformOps.setLocal(transformation.getId(), { translateX: 10, translateY: 20, scaleX: 2, scaleY: 3 }));

		const nextMatrix = new Matrix(30, 40, 4, 5);
		transformation.apply(transformOps.setLocalMatrix(transformation.getId(), nextMatrix));

		expect(transformation.previous.compare(new Matrix(10, 20, 2, 3))).toBe(true);
		expect(transformation.toMatrix().compare(nextMatrix)).toBe(true);
	});
});
