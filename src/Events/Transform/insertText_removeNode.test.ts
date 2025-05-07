import { insertText_removeNode } from "./insertText_removeNode";
import { InsertTextOperation, RemoveNodeOperation } from "slate";

describe("insertText_removeNode transformation", () => {
	it("should not shift when insert and remove at the same shallow path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "a",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [0] });
	});

	it("should not shift when insert and remove at different root paths", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "xx",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [2] });
	});

	it("should not shift when insert at parent and remove at nested child", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 0,
			text: "foo",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1, 0] });
	});

	it("should not shift when insert at nested child and remove at parent", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2, 3],
			offset: 5,
			text: "bar",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [2] });
	});

	it("should not shift when insert and remove share part of the path but differ at an index", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0, 2],
			offset: 3,
			text: "baz",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [0, 1] });
	});

	it("should not shift for deeply nested remove when insert is elsewhere", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [3, 0, 1],
			offset: 4,
			text: "xyz",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 5, 0],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [2, 5, 0] });
	});

	it("should preserve additional properties on RemoveNodeOperation", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "m",
		};
		const toTransform: RemoveNodeOperation & any = {
			type: "remove_node",
			path: [1],
			customFlag: true,
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1],
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
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [0] });
	});

	it("should not shift when insert beyond removal depth", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1, 2, 3],
			offset: 5,
			text: "long",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [0, 1] });
	});

	it("should not shift when removal and insertion occur in distinct branches", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [4, 2],
			offset: 2,
			text: "hi",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [4, 3],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [4, 3] });
	});

	it("should not shift when multiple inserts applied sequentially", () => {
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
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const r1 = insertText_removeNode(i1, original);
		const r2 = insertText_removeNode(i2, r1);
		expect(r2).toEqual({ type: "remove_node", path: [1] });
	});

	it("should handle batch operations without altering any paths", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 3,
			text: "XYZ",
		};
		const ops: RemoveNodeOperation[] = [
			{ type: "remove_node", path: [0] },
			{ type: "remove_node", path: [2] },
			{ type: "remove_node", path: [5, 0] },
		];
		const results = ops.map(op => insertText_removeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "remove_node", path: [0] },
			{ type: "remove_node", path: [2] },
			{ type: "remove_node", path: [5, 0] },
		]);
	});

	it("should not shift when insert at same parent index but remove at different child index", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [3],
			offset: 0,
			text: "foo",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [3, 2],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [3, 2] });
	});

	it("should not shift when insert at deeper path but remove at sibling branch", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0, 0],
			offset: 1,
			text: "x",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1, 1] });
	});

	it("should not shift when insert and remove at completely unrelated branches", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [7, 3, 1],
			offset: 4,
			text: "unrelated",
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 0, 0],
		};
		const result = insertText_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [0, 0, 0] });
	});
});
