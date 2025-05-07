import { insertText_insertNode } from "./insertText_insertNode";
import { InsertTextOperation, InsertNodeOperation } from "slate";

describe("insertText_insertNode transformation", () => {
	const dummyNode = { type: "dummy", children: [] };

	it("should not shift path when insert and insertNode at the same shallow path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "a",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0],
			node: dummyNode,
		});
	});

	it("should not shift path when insert and insertNode at different root paths", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "xx",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2],
			node: dummyNode,
		});
	});

	it("should not shift when insert at parent path and insertNode at nested child", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 0,
			text: "foo",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		});
	});

	it("should not shift when insert at nested child and insertNode at parent", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2, 3],
			offset: 5,
			text: "bar",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2],
			node: dummyNode,
		});
	});

	it("should not shift when insert and insertNode share part of the path but differ at index", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0, 2],
			offset: 3,
			text: "baz",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 1],
			node: dummyNode,
		});
	});

	it("should not shift for deeply nested insertNode when insert is elsewhere", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [3, 0, 1],
			offset: 4,
			text: "xyz",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 5, 0],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 5, 0],
			node: dummyNode,
		});
	});

	it("should preserve additional properties on InsertNodeOperation", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "m",
		};
		const toTransform: InsertNodeOperation & any = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
			customFlag: true,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: dummyNode,
			customFlag: true,
		});
	});

	it("should handle zero-length text insert without changing path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 10,
			text: "",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0],
			node: dummyNode,
		});
	});

	it("should not shift when insertion beyond depth of insertNode path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1, 2, 3],
			offset: 5,
			text: "long",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 1],
			node: dummyNode,
		});
	});

	it("should not shift when insertion and insertNode occur in distinct branches", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [4, 2],
			offset: 2,
			text: "hi",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [4, 3],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [4, 3],
			node: dummyNode,
		});
	});

	it("should handle multiple sequential calls without altering path", () => {
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
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const r1 = insertText_insertNode(i1, original);
		const r2 = insertText_insertNode(i2, r1);
		expect(r2).toEqual({
			type: "insert_node",
			path: [1],
			node: dummyNode,
		});
	});

	it("should handle batch operations without altering any paths", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 3,
			text: "XYZ",
		};
		const ops: InsertNodeOperation[] = [
			{ type: "insert_node", path: [0], node: dummyNode },
			{ type: "insert_node", path: [2], node: dummyNode },
			{ type: "insert_node", path: [5, 0], node: dummyNode },
		];
		const results = ops.map(op => insertText_insertNode(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_node", path: [0], node: dummyNode },
			{ type: "insert_node", path: [2], node: dummyNode },
			{ type: "insert_node", path: [5, 0], node: dummyNode },
		]);
	});

	it("should not shift when insertion path is a sibling branch", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [3],
			offset: 1,
			text: "foo",
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [4],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [4],
			node: dummyNode,
		});
	});

	it("should return a new object and not mutate the original", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "keep",
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const result = insertText_insertNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "insert_node",
			path: [1],
			node: dummyNode,
		});
	});
});
