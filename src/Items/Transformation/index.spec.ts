import { describe, it, expect } from 'bun:test';
import { Point } from '../Point/Point';
import { Matrix } from './Matrix';
import { Transformation } from './Transformation';

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

	it('routes setLocal through apply while preserving published preview semantics', () => {
		const transformation = new Transformation('item-1');
		const published: { method: string; matrix: Matrix | null }[] = [];

		transformation.subject.subscribe((_subject, op) => {
			published.push({
				method: op.method,
				matrix: op.method === 'applyMatrix'
					? new Matrix(
						op.items[0]?.matrix.translateX ?? 0,
						op.items[0]?.matrix.translateY ?? 0,
						op.items[0]?.matrix.scaleX ?? 1,
						op.items[0]?.matrix.scaleY ?? 1,
						op.items[0]?.matrix.shearX ?? 0,
						op.items[0]?.matrix.shearY ?? 0,
					)
					: null,
			});
		});

		transformation.setLocal(10, 20, 2, 3);

		expect(transformation.getTranslation()).toEqual({ x: 10, y: 20 });
		expect(transformation.getScale()).toEqual({ x: 2, y: 3 });
		expect(published).toHaveLength(1);
		expect(published[0]?.method).toBe('applyMatrix');
		expect(published[0]?.matrix?.compare(new Matrix(10, 20, 2, 3))).toBe(true);
	});

	it('routes setLocalMatrix through apply and preserves the previous matrix', () => {
		const transformation = new Transformation('item-1');
		transformation.setLocal(10, 20, 2, 3);

		const nextMatrix = new Matrix(30, 40, 4, 5);
		transformation.setLocalMatrix(nextMatrix);

		expect(transformation.previous.compare(new Matrix(10, 20, 2, 3))).toBe(true);
		expect(transformation.toMatrix().compare(nextMatrix)).toBe(true);
	});
});
