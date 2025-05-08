import { insertNode_mergeNode } from "./insertNode_mergeNode";
import { InsertNodeOperation, MergeNodeOperation } from "slate";

describe("insertNode_mergeNode transformation", () => {
	const dummyNode = { type: "dummy", children: [] };

	it("should shift merge_node path at root when insertion at same index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 1,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 1 });
	});

	it("should shift merge_node path at root when insertion before transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 3,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [3], position: 3 });
	});

	it("should not shift merge_node path at root when insertion after transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [3],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 0,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [2], position: 0 });
	});

	it("should shift merge_node path at second level when sibling insertion before it", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 5,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 3],
			position: 5,
		});
	});

	it("should shift merge_node path at second level when insertion index equals transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 2,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 3],
			position: 2,
		});
	});

	it("should not shift merge_node path at second level when insertion index greater than transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 3],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 4,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 2],
			position: 4,
		});
	});

	it("should shift merge_node when insertion is ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 5],
			position: 7,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 5],
			position: 7,
		});
	});

	it("should shift merge_node when insertion is deeper ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 0, 2],
			position: 3,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 1, 2],
			position: 3,
		});
	});

	it("should not shift merge_node when insertion is descendant of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 0],
			position: 1,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 0],
			position: 1,
		});
	});

	it("should not shift merge_node when insertion is on a different branch", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 2,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 1],
			position: 2,
		});
	});

	it("should shift merge_node path at deep sibling when insertion at same index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 0],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 1, 0],
			position: 9,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [2, 1, 1],
			position: 9,
		});
	});

	it("should shift merge_node at sibling branch when insertion at [2,1] before [2,2,3]", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1],
			node: dummyNode,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 2, 3],
			position: 0,
		};
		const result = insertNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [2, 3, 3],
			position: 0,
		});
	});

	it("should handle multiple sequential insertions", () => {
		const i1: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const i2: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 5,
		};
		const r1 = insertNode_mergeNode(i1, original);
		const r2 = insertNode_mergeNode(i2, r1);
		expect(r2).toEqual({ type: "merge_node", path: [4], position: 5 });
	});

	it("should handle batch operations correctly", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const ops: MergeNodeOperation[] = [
			{ type: "merge_node", path: [0], position: 1 },
			{ type: "merge_node", path: [1], position: 2 },
			{ type: "merge_node", path: [2, 0], position: 3 },
		];
		const results = ops.map(op => insertNode_mergeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "merge_node", path: [1], position: 1 },
			{ type: "merge_node", path: [2], position: 2 },
			{ type: "merge_node", path: [3, 0], position: 3 },
		]);
	});

	it("should preserve additional properties and not mutate original", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const original: MergeNodeOperation & any = {
			type: "merge_node",
			path: [0],
			position: 4,
			customFlag: true,
		};
		const result = insertNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 4,
			customFlag: true,
		});
		expect(result).not.toBe(original);
	});
});
