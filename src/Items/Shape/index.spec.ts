import { beforeAll, describe, it, expect } from 'bun:test';
import { Board } from 'Board';
import { Shape } from './Shape';
import { Point } from '../Point';
import { Mbr } from '../Mbr';
import { initNodeSettings } from 'api/initNodeSettings';

beforeAll(() => {
	initNodeSettings();
});

describe('to diagram user of shapes', () => {
	const board = new Board();
	it('changes shape`s type', () => {
		const shape = new Shape(board);
		const type = 'Circle';
		shape.setShapeType(type);
		expect(shape.getShapeType()).toBe(type);
	});
	it('changes shapes background color', () => {
		const shape = new Shape(board);
		const color = '';
		shape.setBackgroundColor(color);
		expect(shape.getBackgroundColor()).toBe(color);
	});
	it('changes shapes border color', () => {
		const shape = new Shape(board);
		const color = '';
		shape.setBorderColor(color);
		expect(shape.getStrokeColor()).toBe(color);
	});
	it('changes shapes border style', () => {
		const shape = new Shape(board);
		const style = 'dot';
		shape.setBorderStyle(style);
		expect(shape.getBorderStyle()).toBe(style);
	});
	it('changes shape`s border width', () => {
		const shape = new Shape(board);
		const width = 2;
		shape.setBorderWidth(width);
		expect(shape.getStrokeWidth()).toBe(width);
	});

	describe('finds if shape is', () => {
		const board = new Board();
		it('in view', () => {
			const shape = new Shape(board);
			expect(shape.isInView(new Mbr(0, 0, 100, 100))).toBe(true);
		});
		it('under pointer', () => {
			const shape = new Shape(board);
			expect(shape.isUnderPoint(new Point(100, 100))).toBe(true);
		});
		it('near pointer', () => {
			const shape = new Shape(board);
			expect(shape.isNearPoint(new Point(100, 100), 100)).toBe(true);
		});
	});

	it('drags a shape', () => {
		const board = new Board();
		const shape = new Shape(board);
		shape.transformation.translateTo(10, 20);
		expect(shape.transformation.getTranslation()).toEqual({ x: 10, y: 20 });
	});
});
