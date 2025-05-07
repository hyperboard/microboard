import { mergeNode_insertNode } from "./mergeNode_insertNode";
import { MergeNodeOperation, InsertNodeOperation } from "slate";

describe("mergeNode_insertNode transformation", () => {
	it("should shift root-level sibling after merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { a: 1 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { a: 1 },
		});
	});

	it("should not shift root-level sibling before merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { b: 2 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { b: 2 },
		});
	});

	it("should not shift ancestor paths (descendant test)", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: { c: 3 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 0],
			node: { c: 3 },
		});
	});

	it("should shift nested sibling after merge at depth 1", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { d: 4 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 1],
			node: { d: 4 },
		});
	});

	it("should not shift nested sibling before merge at depth 1", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 1],
			node: { e: 5 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 1],
			node: { e: 5 },
		});
	});

	it("should shift deep nested sibling after merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 2, 1],
			node: { f: 6 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 1, 1],
			node: { f: 6 },
		});
	});

	it("should not shift deep nested sibling before merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1, 5],
			node: { g: 7 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 1, 5],
			node: { g: 7 },
		});
	});

	it("should shift descendant of merged node", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 2],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 2, 3],
			node: { h: 8 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 1, 3],
			node: { h: 8 },
		});
	});

	it("should not shift when path shorter than merge path", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1, 1],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 1],
			node: { i: 9 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 1],
			node: { i: 9 },
		});
	});

	it("should shift multi-depth nested sibling after merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2, 3],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2, 4, 0],
			node: { j: 10 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 2, 3, 0],
			node: { j: 10 },
		});
	});

	it("should not shift sibling on different branch", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [3],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0],
			node: { k: 11 },
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 0],
			node: { k: 11 },
		});
	});

	it("should preserve additional properties on InsertNodeOperation", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: InsertNodeOperation & any = {
			type: "insert_node",
			path: [2],
			node: { l: 12 },
			extra: true,
		};
		const result = mergeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { l: 12 },
			extra: true,
		});
	});

	it("should handle chained merges correctly", () => {
		const m1: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const m2: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1],
			node: { m: 13 },
		};
		const i1 = mergeNode_insertNode(m1, toTransform);
		const result = mergeNode_insertNode(m2, i1);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 1],
			node: { m: 13 },
		});
	});

	it("should handle batch operations", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const ops: InsertNodeOperation[] = [
			{ type: "insert_node", path: [1], node: { n: 14 } },
			{ type: "insert_node", path: [2], node: { o: 15 } },
		];
		const results = ops.map(op => mergeNode_insertNode(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_node", path: [0], node: { n: 14 } },
			{ type: "insert_node", path: [1], node: { o: 15 } },
		]);
	});
});
