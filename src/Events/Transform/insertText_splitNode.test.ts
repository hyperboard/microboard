import { insertText_splitNode } from "./insertText_splitNode";
import { InsertTextOperation, SplitNodeOperation } from "slate";

describe("insertText_splitNode transformation", () => {
	it("should not change split when insert at the same path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "abc",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		});
	});

	it("should not change split for sibling after insert", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "x",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		});
	});

	it("should not change split for sibling before insert", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 2,
			text: "yz",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		});
	});

	it("should not change split for nested deeper path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1],
			offset: 1,
			text: "foo",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 2],
			position: 3,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 2],
			position: 3,
			properties: {},
		});
	});

	it("should not change split for shallower path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1, 2],
			offset: 4,
			text: "bar",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 1,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 1],
			position: 1,
			properties: {},
		});
	});

	it("should not change split for descendant path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 5,
			text: "baz",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 0, 1],
			position: 2,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 0, 1],
			position: 2,
			properties: {},
		});
	});

	it("should preserve extra properties on SplitNodeOperation", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "qux",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 4,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2],
			position: 4,
			properties: {},
		});
	});

	it("should handle zero-length text insert without changing split", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 0,
			text: "",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		});
	});

	it("should handle chained insert-text then split correctly", () => {
		const i1: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "chain1",
		};
		const s: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1],
			position: 5,
			properties: {},
		};
		const intermediate = insertText_splitNode(i1, s);
		const i2: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "chain2",
		};
		const result = insertText_splitNode(i2, intermediate);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 1],
			position: 5,
			properties: {},
		});
	});

	it("should handle batch operations unchanged", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1, 1],
			offset: 1,
			text: "batch",
		};
		const ops: SplitNodeOperation[] = [
			{ type: "split_node", path: [1], position: 1, properties: {} },
			{ type: "split_node", path: [2, 0], position: 2, properties: {} },
		];
		const results = ops.map(op => insertText_splitNode(confirmed, op));
		expect(results).toEqual([
			{ type: "split_node", path: [1], position: 1, properties: {} },
			{ type: "split_node", path: [2, 0], position: 2, properties: {} },
		]);
	});

	it("should not change split for completely unrelated path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [5, 5],
			offset: 9,
			text: "zzz",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 0],
			position: 3,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 0],
			position: 3,
			properties: {},
		});
	});

	it("should preserve split position when insertion at the same path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 5,
			text: "xyz",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 7,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2],
			position: 7,
			properties: {},
		});
	});

	it("should preserve split position for sibling after insertion", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 2,
			text: "ab",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result.position).toBe(0);
	});

	it("should preserve split position for nested deeper insertion", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1, 1],
			offset: 3,
			text: "deeper",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 5,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result.position).toBe(5);
	});

	it("should preserve split position when insertion at unrelated path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [3, 0],
			offset: 1,
			text: "unrelated",
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1],
			position: 9,
			properties: {},
		};
		const result = insertText_splitNode(confirmed, toTransform);
		expect(result.position).toBe(9);
	});

	it("should preserve split position and extra props for batch operations", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "batch",
		};
		const ops: SplitNodeOperation[] = [
			{
				type: "split_node",
				path: [1],
				position: 2,
				properties: {},
			},
			{
				type: "split_node",
				path: [2],
				position: 3,
				properties: {},
			},
		];
		const results = ops.map(op => insertText_splitNode(confirmed, op));
		expect(results).toEqual([
			{
				type: "split_node",
				path: [1],
				position: 2,
				properties: {},
			},
			{
				type: "split_node",
				path: [2],
				position: 3,
				properties: {},
			},
		]);
	});
});
