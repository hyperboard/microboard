import { beforeAll, describe, it, expect } from 'bun:test';
import { Board } from 'Board';
import { Shape } from './index';
import { propertyOps } from '../propertyOps';
import { transformOps } from '../Transformation/transformOps';
import { Point } from '../Point';
import { Mbr } from '../Mbr';
import { initNodeSettings } from 'api/initNodeSettings';
import { fixedColor, semanticColor } from 'Color';

beforeAll(() => {
	initNodeSettings();
});

describe('to diagram user of shapes', () => {
	const board = new Board();
	it('changes shape`s type', () => {
		const shape = new Shape(board);
		const type = 'Circle';
		shape.apply(propertyOps.setProperty([shape], "shapeType", type));
		expect(shape.getShapeType()).toBe(type);
	});
	it('changes shapes background color', () => {
		const shape = new Shape(board);
		const color = fixedColor('rgb(255, 0, 0)');
		shape.apply(propertyOps.setProperty([shape], "backgroundColor", color));
		expect(shape.getBackgroundColor()).toEqual(color);
	});
	it('changes shapes background color with semantic color', () => {
		const shape = new Shape(board);
		const color = semanticColor('contrastBlue');
		shape.apply(propertyOps.setProperty([shape], "backgroundColor", color));
		expect(shape.getBackgroundColor()).toEqual(color);
	});
	it('changes shapes border color', () => {
		const shape = new Shape(board);
		const color = fixedColor('rgb(0, 0, 0)');
		shape.apply(propertyOps.setProperty([shape], "borderColor", color));
		expect(shape.getStrokeColor()).toEqual(color);
	});
	it('changes shapes border style', () => {
		const shape = new Shape(board);
		const style = 'dot';
		shape.apply(propertyOps.setProperty([shape], "borderStyle", style));
		expect(shape.getBorderStyle()).toBe(style);
	});
	it('changes shape`s border width', () => {
		const shape = new Shape(board);
		const width = 2;
		shape.apply(propertyOps.setProperty([shape], "borderWidth", width));
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
		shape.apply(transformOps.translateTo(shape, 10, 20));
		expect(shape.transformation.getTranslation()).toEqual({ x: 10, y: 20 });
	});
});
