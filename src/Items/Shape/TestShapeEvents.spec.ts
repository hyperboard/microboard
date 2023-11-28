import { assert } from "chai";
import { Board } from "Board";
import { Shape } from "./Shape";
import { testTransformation } from "../Transformation/testTransformation";

describe("Shape - Events", () => {
	// const server = new ConnectionMock();
	const board = new Board("");

	const shape = new Shape();

	describe("board.add: ShapeCreateEvent", () => {
		it("Apply", () => {
			board.add(shape);
			assert.exists(
				board.items.findById(shape.getId()),
				"not found shape",
			);
		});

		it("Undo", () => {
			board.undo();
			assert.notExists(
				board.items.findById(shape.getId()),
				"found shape after undo create",
			);
		});

		it("Redo", () => {
			board.redo();
			assert.exists(
				board.items.findById(shape.getId()),
				"not found shape after redo",
			);
		});
	});

	describe("shape.setBackgroundColor: ShapeBackgroundColorEditEvent", () => {
		const startColor = shape.getBackgroundColor();
		const newBackgroundColor = "#000";

		it("Apply", () => {
			shape.setBackgroundColor(newBackgroundColor);
			assert.equal(
				shape.getBackgroundColor(),
				newBackgroundColor,
				"not equal new background color",
			);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(
				shape.getBackgroundColor(),
				startColor,
				"not equal default background color after undo",
			);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(
				shape.getBackgroundColor(),
				newBackgroundColor,
				"not equal new background color after redo",
			);
		});
	});

	describe("shape.setBackgroundOpacity :ShapeBackgroundOpacityEditEvent", () => {
		const startValue = shape.getBackgroundOpacity();
		const newValue = 0.5;

		it("Apply", () => {
			shape.setBackgroundOpacity(newValue);
			assert.equal(shape.getBackgroundOpacity(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(shape.getBackgroundOpacity(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(shape.getBackgroundOpacity(), newValue);
		});
	});

	describe("shape.setBorderColor: ShapeBorderColorEditEvent", () => {
		const startValue = shape.getStrokeColor();
		const newValue = "#123456";

		it("Apply", () => {
			shape.setBorderColor(newValue);
			assert.equal(shape.getStrokeColor(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(shape.getStrokeColor(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(shape.getStrokeColor(), newValue);
		});
	});

	describe("shape.setBorderOpacity: ShapeBorderOpacityEditEvent", () => {
		const startValue = shape.getBorderOpacity();
		const newValue = 0.5;

		it("Apply", () => {
			shape.setBorderOpacity(newValue);
			assert.equal(shape.getBorderOpacity(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(shape.getBorderOpacity(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(shape.getBorderOpacity(), newValue);
		});
	});

	describe("shape.setBorderStyle: ShapeBorderStyleEditEvent", () => {
		const startValue = shape.getBorderStyle();
		const newValue = "solid";

		it("Apply", () => {
			shape.setBorderStyle(newValue);
			assert.equal(shape.getBorderStyle(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(shape.getBorderStyle(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(shape.getBorderStyle(), newValue);
		});
	});

	describe("shape.setBorderWidth: ShapeBorderWidthEditEvent", () => {
		const startValue = shape.getStrokeWidth();
		const newValue = 15;

		it("Apply", () => {
			shape.setBorderWidth(newValue);
			assert.equal(shape.getStrokeWidth(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(shape.getStrokeWidth(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(shape.getStrokeWidth(), newValue);
		});
	});

	describe("board.remove: ShapeDeleteEvent", () => {
		it("Apply", () => {
			board.remove(shape);
			assert.notExists(
				board.items.findById(shape.getId()),
				"found shape, after remove",
			);
		});

		it("Undo", () => {
			board.undo();
			assert.exists(
				board.items.findById(shape.getId()),
				" not found shape, after undo remove",
			);
		});

		it("Redo", () => {
			board.redo();
			assert.notExists(
				board.items.findById(shape.getId()),
				"found shape, after redo remove",
			);
		});
	});

	describe("Shape.transformation", () => {
		testTransformation(shape.transformation);
	});
});
