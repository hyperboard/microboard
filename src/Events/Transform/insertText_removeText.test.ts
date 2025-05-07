import { insertText_removeText } from "./insertText_removeText";
import { InsertTextOperation, RemoveTextOperation, Path } from "slate";

describe("insertText_removeText transformation", () => {
	it("should shift remove offset when insert before removal offset", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 2,
			text: "ab",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0],
			offset: 5,
			text: "xyz",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0],
			offset: 7,
			text: "xyz",
		});
	});

	it("should shift remove offset when insert exactly at removal offset", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "hello",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 3,
			text: "world",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 8,
			text: "world",
		});
	});

	it("should not shift when insert after removal offset", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 6,
			text: "123",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 4,
			text: "abc",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2],
			offset: 4,
			text: "abc",
		});
	});

	it("should not shift when paths differ", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "x",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 5,
			text: "y",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 5,
			text: "y",
		});
	});

	it("should not shift when remove at nested deeper path and insert at parent", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "m",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 2,
			text: "n",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 2,
			text: "n",
		});
	});

	it("should not shift when remove at parent path and insert at nested deeper", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 2,
			text: "t",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 3,
			text: "u",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 3,
			text: "u",
		});
	});

	it("should not shift when remove at descendant path and insert at ancestor", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 5,
			text: "baz",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2, 0, 1],
			offset: 2,
			text: "qux",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2, 0, 1],
			offset: 2,
			text: "qux",
		});
	});

	it("should preserve additional properties on RemoveTextOperation", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "meta",
		};
		const toTransform: RemoveTextOperation & any = {
			type: "remove_text",
			path: [1],
			offset: 3,
			text: "info",
			bold: true,
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 7,
			text: "info",
			bold: true,
		});
	});

	it("should handle zero-length text insert without changing removal", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 5,
			text: "",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0],
			offset: 4,
			text: "x",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0],
			offset: 4,
			text: "x",
		});
	});

	it("should accumulate offsets when multiple inserts before remove", () => {
		const i1: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "A",
		};
		const i2: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "B",
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 4,
			text: "test",
		};
		const r1 = insertText_removeText(i1, original);
		const r2 = insertText_removeText(i2, r1);
		expect(r2).toEqual({
			type: "remove_text",
			path: [1],
			offset: 6,
			text: "test",
		});
	});

	it("should handle batch operations", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 3,
			text: "XYZ",
		};
		const ops: RemoveTextOperation[] = [
			{ type: "remove_text", path: [0], offset: 1, text: "a" },
			{ type: "remove_text", path: [1], offset: 2, text: "b" },
		];
		const results = ops.map(op => insertText_removeText(confirmed, op));
		expect(results).toEqual([
			{ type: "remove_text", path: [0], offset: 1, text: "a" },
			{ type: "remove_text", path: [1], offset: 2, text: "b" },
		]);
	});

	it("should not shift when insertion beyond removal", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 10,
			text: "longtext",
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 5,
			text: "z",
		};
		const result = insertText_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2],
			offset: 5,
			text: "z",
		});
	});
});
