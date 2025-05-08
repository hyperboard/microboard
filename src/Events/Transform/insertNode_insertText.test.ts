import { insertNode_insertText } from "./insertNode_insertText";
import { InsertNodeOperation, InsertTextOperation } from "slate";

describe("insertNode_insertText transformation", () => {
	const sampleNode: any = { type: "dummy", children: [] };
	const sampleText = "hello";

	it("should shift text op path when insertion at same root index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 2,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 2,
			text: sampleText,
		});
	});

	it("should shift text op path when insertion before transform at root", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 5,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [3],
			offset: 5,
			text: sampleText,
		});
	});

	it("should not shift text op path when insertion after transform at root", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [3],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 1,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2],
			offset: 1,
			text: sampleText,
		});
	});

	it("should shift text op path at second level when sibling insertion before it", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2],
			offset: 3,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 3],
			offset: 3,
			text: sampleText,
		});
	});

	it("should shift text op path at second level when insertion index equals transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2],
			offset: 4,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 3],
			offset: 4,
			text: sampleText,
		});
	});

	it("should not shift text op path at second level when insertion index greater", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 3],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2],
			offset: 6,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 2],
			offset: 6,
			text: sampleText,
		});
	});

	it("should shift text op path when insertion is ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0, 5],
			offset: 0,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 5],
			offset: 0,
			text: sampleText,
		});
	});

	it("should not shift text op path when insertion is descendant of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 8,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 0],
			offset: 8,
			text: sampleText,
		});
	});

	it("should not shift text op path when insertion in different branch", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 1],
			offset: 9,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 1],
			offset: 9,
			text: sampleText,
		});
	});

	it("should preserve offset and text unchanged", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 7,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result.offset).toBe(7);
		expect(result.text).toBe(sampleText);
	});

	it("should preserve additional properties on InsertTextOperation", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: sampleNode,
		};
		const toTransform: InsertTextOperation & any = {
			type: "insert_text",
			path: [0],
			offset: 4,
			text: sampleText,
			bold: true,
		};
		const result = insertNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 4,
			text: sampleText,
			bold: true,
		});
	});

	it("should accumulate path shifts on multiple sequential calls", () => {
		const i1: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: sampleNode,
		};
		const i2: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: sampleNode,
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: sampleText,
		};
		const r1 = insertNode_insertText(i1, original);
		const r2 = insertNode_insertText(i2, r1);
		expect(r2).toEqual({
			type: "insert_text",
			path: [3],
			offset: 3,
			text: sampleText,
		});
	});

	it("should handle batch operations without altering unrelated paths", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: sampleNode,
		};
		const ops: InsertTextOperation[] = [
			{ type: "insert_text", path: [0], offset: 1, text: sampleText },
			{ type: "insert_text", path: [1], offset: 2, text: sampleText },
			{ type: "insert_text", path: [2, 0], offset: 3, text: sampleText },
		];
		const results = ops.map(op => insertNode_insertText(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_text", path: [1], offset: 1, text: sampleText },
			{ type: "insert_text", path: [2], offset: 2, text: sampleText },
			{ type: "insert_text", path: [3, 0], offset: 3, text: sampleText },
		]);
	});

	it("should not mutate the original InsertTextOperation object", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: sampleNode,
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 5,
			text: sampleText,
		};
		const result = insertNode_insertText(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "insert_text",
			path: [1],
			offset: 5,
			text: sampleText,
		});
	});
});
