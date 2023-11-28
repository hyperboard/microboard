import { Board } from "../../Board";
import { RichText } from "./RichText";
import { assert } from "chai";
import { testTransformation } from "../Transformation/testTransformation";
import { Mbr } from "../Mbr";
import { TextStyle } from "./Editor/TextNode";
import { BlockType } from "./Editor/BlockNode";
import { ConnectionMock } from "Connection";

describe("Test Text events", () => {
	const server = new ConnectionMock();
	const board = new Board("", server);

	const text = new RichText(new Mbr(), "", board.events);
	text.setId(userService.getNextLocalItemId());

	describe("TextCreateEvent", () => {
		it("Apply", () => {
			board.add(text);
			assert.exists(board.items.findById(text.getId()), "not found text");
		});

		it("Undo", () => {
			board.undo();
			assert.notExists(
				board.items.findById(text.getId()),
				"found text after undo create",
			);
		});

		it("Redo", () => {
			board.redo();
			assert.exists(
				board.items.findById(text.getId()),
				"not found text after redo",
			);
		});
	});

	describe("TextBlockTypeEditEvent", () => {
		const startValue = text.getBlockType();
		const newValue: BlockType = "block-quote";

		it("Apply", () => {
			text.setBlockType(newValue);
			assert.equal(text.getBlockType(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(text.getBlockType(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(text.getBlockType(), newValue);
		});
	});

	describe("TextFontColorEditEvent", () => {
		const startValue = text.getFontColor();
		const newValue = "#123456";

		it("Apply", () => {
			text.setFontColor(newValue);
			assert.equal(text.getFontColor(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(text.getFontColor(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(text.getFontColor(), newValue);
		});
	});

	describe("TextFontFamilyEditEvent", () => {
		const startValue = text.getFontFamily();
		const newValue = "Arial";

		it("Apply", () => {
			text.setFontFamily(newValue);
			assert.equal(text.getFontFamily(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(text.getFontFamily(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(text.getFontFamily(), newValue);
		});
	});

	describe("TextFontSizeEditEvent", () => {
		const startValue = text.getFontSize();
		const newValue = 15;

		it("Apply", () => {
			text.setFontSize(newValue);
			assert.equal(text.getFontSize(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(text.getFontSize(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(text.getFontSize(), newValue);
		});
	});

	describe("TextFontStyleEditEvent", () => {
		const startValue = text.getFontStyles();
		const newValue: TextStyle[] = ["italic"];

		it("Apply", () => {
			text.setFontStyle(newValue);
			assert.equal(text.getFontStyles(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(text.getFontStyles(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(text.getFontStyles(), newValue);
		});
	});

	describe("TextHighlightEditEvent", () => {
		const startValue = text.getFontHighlight();
		const newValue = "#ffff00";

		it("Apply", () => {
			text.setFontHighlight(newValue);
			assert.equal(text.getFontHighlight(), newValue);
		});

		it("Undo", () => {
			board.undo();
			assert.equal(text.getFontHighlight(), startValue);
		});

		it("Redo", () => {
			board.redo();
			assert.equal(text.getFontHighlight(), newValue);
		});
	});

	describe("TextDeleteEvent", () => {
		it("Apply", () => {
			board.remove(text);
			assert.notExists(
				board.items.findById(text.getId()),
				"found text, after remove",
			);
		});

		it("Undo", () => {
			board.undo();
			assert.exists(
				board.items.findById(text.getId()),
				" not found text, after undo remove",
			);
		});

		it("Redo", () => {
			board.redo();
			assert.notExists(
				board.items.findById(text.getId()),
				"found text , after redo remove",
			);
		});
	});

	describe("TextRich.transformation", () => {
		testTransformation(text.transformation);
	});

	/*
	it("drags a text", () => {
		const text = new Text();
		text.drag();
		assert.equal(text.getPosition(), 0);
	});

	it("types text", () => {
		const text = new Text();
		const word = "";
		text.insert(word);
		assert.equal(text.plain, word);
	});

	it("deletes a word", () => {
		const text = new Text();
		const word = "";
		text.insert(word);
		text.remove();
		assert.equal(text.plain, word);
	});

	it("moves cursor", () => {
		const text = new Text();
		const word = "";
		text.insert(word);
		text.moveCursorTo(0);
		assert.equal(text.plain, word);
	});

	it("selects text", () => {
		const text = new Text();
		const start = 0;
		const end = 0;
		text.select(start, end);
		assert.equal(text.selection, 0);
	});

	it("changes text`s alignment", () => {
		const text = new Text();
		const alignment = "";
		text.setAlignment(alignment);
		assert.equal(text.getAlignment(), alignment);
	});

	describe("changes selected text`s", () => {
		it("font family", () => {
			const text = new Text();
			const start = 0;
			const end = 0;
			text.select(start, end);
		});
		it("font size", () => {
			const text = new Text();
			const start = 0;
			const end = 0;
			text.select(start, end);
		});
		it("font style", () => {
			const text = new Text();
			const start = 0;
			const end = 0;
			text.select(start, end);
		});
		it("color", () => {
			const text = new Text();
			const start = 0;
			const end = 0;
			text.select(start, end);
		});
		it("highlight color", () => {
			const text = new Text();
			const start = 0;
			const end = 0;
			text.select(start, end);
		});
	});
	*/
});
