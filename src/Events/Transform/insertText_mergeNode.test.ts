import { insertText_mergeNode } from "./insertText_mergeNode";
import { InsertTextOperation, MergeNodeOperation } from "slate";

describe("insertText_mergeNode transformation", () => {
	it("should shift merge position when insert at sibling before merge path and offset less than position", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 2,
			text: "ab",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 5,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 7,
		});
	});

	it("should shift merge position when insert at sibling before merge path and offset equals position", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 5,
			text: "hello",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 5,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 10,
		});
	});

	it("should not shift merge position when insert at sibling before merge path but offset greater than position", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 6,
			text: "xxx",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 5,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 5,
		});
	});

	it("should not shift when insert and merge paths are equal", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "x",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 3,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 3,
		});
	});

	it("should not shift when paths are not siblings (different parent)", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 2,
			text: "yy",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 4,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 4,
		});
	});

	it("should not shift when insert is ancestor of merge path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "a",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 2,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 2,
		});
	});

	it("should not shift when insert is descendant of merge path", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 3,
			text: "b",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 2,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 2,
		});
	});

	it("should shift for siblings at deeper level when conditions met", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 2,
			text: "cd",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 2],
			position: 3,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [2, 2],
			position: 5,
		});
	});

	it("should shift for siblings at deeper level when insertion offset equals merge position", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1, 1],
			offset: 3,
			text: "uv",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 3,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 2],
			position: 5,
		});
	});

	it("should not shift when siblings at deeper level but offset too large", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 4,
			text: "ef",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 2],
			position: 3,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [2, 2],
			position: 3,
		});
	});

	it("should preserve additional properties on MergeNodeOperation", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 0,
			text: "",
		};
		const toTransform: MergeNodeOperation & any = {
			type: "merge_node",
			path: [1],
			position: 1,
			customFlag: true,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 1,
			customFlag: true,
		});
	});

	it("should handle zero-length text insert without shifting position", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [3],
			offset: 2,
			text: "",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [4],
			position: 2,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [4],
			position: 2,
		});
	});

	it("should accumulate position shift when multiple inserts before merge in same sibling", () => {
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
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 3,
		};
		const r1 = insertText_mergeNode(i1, original);
		const r2 = insertText_mergeNode(i2, r1);
		expect(r2).toEqual({
			type: "merge_node",
			path: [2],
			position: 5,
		});
	});

	it("should handle batch operations with mixed siblings and non-siblings", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "Z",
		};
		const ops: MergeNodeOperation[] = [
			{ type: "merge_node", path: [1], position: 2 },
			{ type: "merge_node", path: [0], position: 3 },
			{ type: "merge_node", path: [0, 1], position: 1 },
		];
		const results = ops.map(op => insertText_mergeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "merge_node", path: [1], position: 3 },
			{ type: "merge_node", path: [0], position: 3 },
			{ type: "merge_node", path: [0, 1], position: 1 },
		]);
	});

	it("should not shift when insertion path is after merge path sibling", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 0,
			text: "Y",
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 1,
		};
		const result = insertText_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 1,
		});
	});
});
