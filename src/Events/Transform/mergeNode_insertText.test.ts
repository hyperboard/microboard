import { mergeNode_insertText } from "./mergeNode_insertText";
import { MergeNodeOperation, InsertTextOperation } from "slate";

describe("mergeNode_insertText transformation", () => {
	it("should add merge position to offset when paths equal (root)", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 4,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "hello",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 9,
			text: "hello",
		});
	});

	it("should add merge position to offset when paths equal (nested)", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 2,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 3],
			offset: 1,
			text: "world",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 3],
			offset: 3,
			text: "world",
		});
	});

	it("should shift root-level sibling after merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 7,
			text: "x",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 7,
			text: "x",
		});
	});

	it("should not shift root-level sibling before merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 5,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "y",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "y",
		});
	});

	it("should shift nested sibling after merge at depth 1", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2],
			offset: 4,
			text: "foo",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 2],
			offset: 4,
			text: "foo",
		});
	});

	it("should not shift nested sibling before merge at depth 1", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 1,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 1],
			offset: 2,
			text: "bar",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 1],
			offset: 2,
			text: "bar",
		});
	});

	it("should shift deep nested sibling after merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 0,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0, 2, 0],
			offset: 1,
			text: "baz",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 1, 0],
			offset: 1,
			text: "baz",
		});
	});

	it("should not shift deep nested sibling before merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2],
			position: 2,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1, 5],
			offset: 3,
			text: "qux",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 1, 5],
			offset: 3,
			text: "qux",
		});
	});

	it("should preserve offset and text properties for unrelated paths", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [3],
			position: 3,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [5],
			offset: 10,
			text: "hello",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [4],
			offset: 10,
			text: "hello",
		});
	});

	it("should handle zero-length text insertion on equal paths", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 5,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 0,
			text: "",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "",
		});
	});

	it("should handle chained merges and insert-text correctly", () => {
		const m1: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 2,
		};
		const m2: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 1,
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 6,
			text: "chain",
		};
		const i1 = mergeNode_insertText(m1, original);
		const result = mergeNode_insertText(m2, i1);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 1],
			offset: 6,
			text: "chain",
		});
	});

	it("should handle batch operations at various depths", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 1,
		};
		const ops: InsertTextOperation[] = [
			{ type: "insert_text", path: [0, 2], offset: 1, text: "a" },
			{ type: "insert_text", path: [1], offset: 2, text: "b" },
		];
		const results = ops.map(op => mergeNode_insertText(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_text", path: [0, 1], offset: 1, text: "a" },
			{ type: "insert_text", path: [1], offset: 2, text: "b" },
		]);
	});

	it("should not shift when toTransform.path shorter than merge path", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 2],
			position: 2,
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 4,
			text: "short",
		};
		const result = mergeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2],
			offset: 4,
			text: "short",
		});
	});
});
