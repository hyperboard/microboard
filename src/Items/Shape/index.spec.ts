import { Board } from "Board";
import { assert } from "chai";
import { Shape } from "./Shape";
import { Point } from "../Point";
import { Mbr } from "../Mbr";
import { initBrowserSettings } from "Board/api/initBrowserSettings";

beforeAll(() => {
	initBrowserSettings();
});

describe("to diagram user of shapes", () => {
	const board = new Board();
	it("changes shape`s type", () => {
		const shape = new Shape(board);
		const type = "Circle";
		shape.setShapeType(type);
		assert.equal(shape.getShapeType(), type);
	});
	it("changes shapes background color", () => {
		const shape = new Shape(board);
		const color = "";
		shape.setBackgroundColor(color);
		assert.equal(shape.getBackgroundColor(), color);
	});
	it("changes shapes border color", () => {
		const shape = new Shape(board);
		const color = "";
		shape.setBorderColor(color);
		assert.equal(shape.getStrokeColor(), color);
	});
	it("changes shapes border style", () => {
		const shape = new Shape(board);
		const style = "dot";
		shape.setBorderStyle(style);
		assert.equal(shape.getBorderStyle(), style);
	});
	it("changes shape`s border width", () => {
		const shape = new Shape(board);
		const width = 2;
		shape.setBorderWidth(width);
		assert.equal(shape.getStrokeWidth(), width);
	});

	describe("finds if shape is", () => {
		const board = new Board();
		it("in view", () => {
			const shape = new Shape(board);
			assert.isTrue(shape.isInView(new Mbr()));
		});
		it("under pointer", () => {
			const shape = new Shape(board);
			const x = 100;
			const y = 100;
			assert.isTrue(shape.isUnderPoint(new Point(x, y)));
		});
		it("near pointer", () => {
			const shape = new Shape(board);
			const x = 100;
			const y = 100;
			const distance = 100;
			assert.isTrue(shape.isNearPoint(new Point(x, y), distance));
		});
		it("distance to a pointer", () => {
			const shape = new Shape(board);
			const x = 100;
			const y = 100;
			const distance = 100;
			assert.equal(shape.getDistanceToPoint(new Point(x, y)), distance);
		});
		it("nearest point", () => {
			const shape = new Shape(board);
			const x = 100;
			const y = 100;
			const nearestPoint = { x: 100, y: 100 };
			assert.equal(
				shape.getNearestEdgePointTo(new Point(x, y)),
				nearestPoint,
			);
		});
		it("nearest point on the edge", () => {
			const shape = new Shape(board);
			const x = 100;
			const y = 100;
			const nearestPoint = { x: 100, y: 100 };
			assert.equal(
				shape.getNearestEdgePointTo(new Point(x, y)),
				nearestPoint,
			);
		});
		it("nearest point on the edge", () => {
			const shape = new Shape(board);
			const x = 100;
			const y = 100;
			const nearestPoint = { x: 100, y: 100 };
			assert.equal(
				shape.getNearestEdgePointTo(new Point(x, y)),
				nearestPoint,
			);
		});
		/* 		it("normal", () => {
			const shape = new Shape();
			const x = 100;
			const y = 100;
			const normal = new Line(new Point(100, 100), new Point(100, 100));
			assert.equal(shape.getNormal(new Point(x, y)), normal);
		}); */
		it("enclosed by a rectangular area (window selection)", () => {
			const board = new Board();
			const shape = new Shape(board);
			board.add(shape);
			const left = 0;
			const top = 0;
			const right = 100;
			const bottom = 100;
			board.camera.view(left, top, 2);
			assert.equal(board.items.getEnclosed(left, top, right, bottom), [
				shape,
			]);
		});
		it("enclosed or crossed by rectangular area (crossing selection)", () => {
			const board = new Board();
			const shape = new Shape(board);
			board.add(shape);
			const left = 0;
			const top = 0;
			const right = 100;
			const bottom = 100;
			board.camera.view(left, top, 2);
			assert.equal(
				board.items.getEnclosedOrCrossed(left, top, right, bottom),
				[shape],
			);
		});
	});

	it("drags a shape", () => {
		const board = new Board();
		const shape = new Shape(board);
		shape.transformation.translateTo(10, 20);
		assert.equal(shape.transformation.getTranslation(), { x: 10, y: 20 });
	});
});
