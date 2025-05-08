import { insertNode_removeText } from "./insertNode_removeText";
import { InsertNodeOperation, RemoveTextOperation } from "slate";

describe("insertNode_removeText transformation", () => {
	const sampleText = "hello";

	it("should shift remove_text path at root when insertion at same index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0],
			offset: 2,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 2,
			text: sampleText,
		});
	});

	it("should shift remove_text path at root when insertion before transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 5,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [3],
			offset: 5,
			text: sampleText,
		});
	});

	it("should not shift remove_text path when insertion after transform path at root", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [3],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 1,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2],
			offset: 1,
			text: sampleText,
		});
	});

	it("should shift remove_text path at second level when sibling insertion before it", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 3,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 3],
			offset: 3,
			text: sampleText,
		});
	});

	it("should shift remove_text path at second level when insertion index equals transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 4,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 3],
			offset: 4,
			text: sampleText,
		});
	});

	it("should not shift remove_text path at second level when insertion index greater than transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 3],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 6,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 2],
			offset: 6,
			text: sampleText,
		});
	});

	it("should shift remove_text path when insertion is ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 5],
			offset: 0,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 5],
			offset: 0,
			text: sampleText,
		});
	});

	it("should shift remove_text path when insertion is deeper ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0, 2],
			offset: 7,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 1, 2],
			offset: 7,
			text: sampleText,
		});
	});

	it("should not shift remove_text path when insertion is a descendant of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 8,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 8,
			text: sampleText,
		});
	});

	it("should not shift remove_text path when insertion is on a different branch", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 1],
			offset: 9,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 1],
			offset: 9,
			text: sampleText,
		});
	});

	it("should handle multiple sequential insertions", () => {
		const i1: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { type: "dummy", children: [] },
		};
		const i2: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { type: "dummy", children: [] },
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 3,
			text: sampleText,
		};
		const r1 = insertNode_removeText(i1, original);
		const r2 = insertNode_removeText(i2, r1);
		expect(r2).toEqual({
			type: "remove_text",
			path: [3],
			offset: 3,
			text: sampleText,
		});
	});

	it("should handle batch operations correctly", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { type: "dummy", children: [] },
		};
		const ops: RemoveTextOperation[] = [
			{ type: "remove_text", path: [0], offset: 1, text: sampleText },
			{ type: "remove_text", path: [1], offset: 2, text: sampleText },
			{ type: "remove_text", path: [0, 1], offset: 3, text: sampleText },
		];
		const results = ops.map(op => insertNode_removeText(confirmed, op));
		expect(results).toEqual([
			{ type: "remove_text", path: [1], offset: 1, text: sampleText },
			{ type: "remove_text", path: [2], offset: 2, text: sampleText },
			{ type: "remove_text", path: [1, 1], offset: 3, text: sampleText },
		]);
	});

	it("should preserve additional properties on RemoveTextOperation", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { type: "dummy", children: [] },
		};
		const toTransform: RemoveTextOperation & any = {
			type: "remove_text",
			path: [0],
			offset: 4,
			text: sampleText,
			bold: true,
		};
		const result = insertNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 4,
			text: sampleText,
			bold: true,
		});
	});

	it("should not mutate the original RemoveTextOperation", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { type: "dummy", children: [] },
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 5,
			text: sampleText,
		};
		const result = insertNode_removeText(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "remove_text",
			path: [1],
			offset: 5,
			text: sampleText,
		});
	});
});
