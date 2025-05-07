import { insertText_insertText } from "./insertText_insertText";
import { InsertTextOperation, Path } from "slate";

describe("insertText_insertText transformation", () => {
	it("should shift insert offset when another insert is before the transform offset", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 2,
			text: "ab",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 5,
			text: "xyz",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0],
			offset: 7,
			text: "xyz",
		});
	});

	it("should shift when insert exactly at the transform offset", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "hello",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "world",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 8,
			text: "world",
		});
	});

	it("should not shift when the confirmed insert is after the transform offset", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 7,
			text: "123",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 4,
			text: "abc",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
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
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "y",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "y",
		});
	});

	it("should not shift when toTransform is deeper nested and confirmed is at its parent", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "m",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 2,
			text: "n",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 0],
			offset: 2,
			text: "n",
		});
	});

	it("should not shift when toTransform is at parent and confirmed is deeper nested", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 2,
			text: "t",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "u",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "u",
		});
	});

	it("should preserve additional properties on InsertTextOperation", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "meta",
		};
		const toTransform: InsertTextOperation & any = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "info",
			bold: true,
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 7,
			text: "info",
			bold: true,
		});
	});

	it("should handle zero-length text insert without changing transform offset", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 5,
			text: "",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 4,
			text: "x",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0],
			offset: 4,
			text: "x",
		});
	});

	it("should accumulate offsets when multiple inserts before transform", () => {
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
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 4,
			text: "test",
		};
		const r1 = insertText_insertText(i1, original);
		const r2 = insertText_insertText(i2, r1);
		expect(r2).toEqual({
			type: "insert_text",
			path: [1],
			offset: 6,
			text: "test",
		});
	});

	it("should handle batch operations without altering unrelated offsets", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 3,
			text: "XYZ",
		};
		const ops: InsertTextOperation[] = [
			{ type: "insert_text", path: [0], offset: 1, text: "a" },
			{ type: "insert_text", path: [1], offset: 2, text: "b" },
		];
		const results = ops.map(op => insertText_insertText(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_text", path: [0], offset: 1, text: "a" },
			{ type: "insert_text", path: [1], offset: 2, text: "b" },
		]);
	});

	it("should shift when operations on nested equal path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 3,
			text: "uv",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 5,
			text: "node",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 1],
			offset: 7,
			text: "node",
		});
	});

	it("should not shift when nested equal path but offset greater", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 6,
			text: "ef",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 5,
			text: "node",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 1],
			offset: 5,
			text: "node",
		});
	});

	it("should shift when both offsets are zero", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 0,
			text: "zero",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 0,
			text: "start",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0],
			offset: 4,
			text: "start",
		});
	});

	it("should not shift when insertion path is a sibling but different index", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [3],
			offset: 1,
			text: "foo",
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [4],
			offset: 2,
			text: "bar",
		};
		const result = insertText_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [4],
			offset: 2,
			text: "bar",
		});
	});

	it("should return a new object and not mutate the original", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "keep",
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 4,
			text: "orig",
		};
		const result = insertText_insertText(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "insert_text",
			path: [1],
			offset: 4,
			text: "orig",
		});
	});
});
