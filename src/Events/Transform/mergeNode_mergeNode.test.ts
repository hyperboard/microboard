import { mergeNode_mergeNode } from "./mergeNode_mergeNode";
import { MergeNodeOperation } from "slate";

describe("mergeNode_mergeNode transformation", () => {
	it("should accumulate position when paths equal (root)", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 4,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 3,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 7 });
	});

	it("should accumulate position when paths equal (nested)", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 5,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 2,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [2, 3],
			position: 7,
		});
	});

	it("should shift root-level sibling after merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 1,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 0 });
	});

	it("should not shift root-level sibling before merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 1,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 0 });
	});

	it("should shift first nested index for non-ancestor branch", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 5],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 5],
			position: 0,
		});
	});

	it("should not shift on a different branch", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 0,
		});
	});

	it("should shift nested sibling at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 0,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 3],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 2],
			position: 0,
		});
	});

	it("should not shift nested lower index on same parent", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 0,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 1],
			position: 0,
		});
	});

	it("should shift multi-depth nested sibling", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2, 3],
			position: 0,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2, 5],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [0, 2, 4],
			position: 0,
		});
	});

	it("should not shift descendant beyond merge prefix", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2],
			position: 0,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2, 0],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [0, 2, 0],
			position: 0,
		});
	});

	it("should preserve additional properties", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 1,
		};
		const toTransform: MergeNodeOperation & any = {
			type: "merge_node",
			path: [3],
			position: 0,
			tag: "x",
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [2],
			position: 0,
			tag: "x",
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
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 1],
			position: 5,
		};
		const i1 = mergeNode_mergeNode(m1, toTransform);
		const result = mergeNode_mergeNode(m2, i1);
		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 5,
		});
	});

	it("should handle batch operations", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const ops: MergeNodeOperation[] = [
			{ type: "merge_node", path: [1], position: 1 },
			{ type: "merge_node", path: [2], position: 2 },
		];
		const results = ops.map(op => mergeNode_mergeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "merge_node", path: [0], position: 1 },
			{ type: "merge_node", path: [1], position: 2 },
		]);
	});

	it("should not shift when toTransform.path shorter than merge path", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 0,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 3,
		};
		const result = mergeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 3 });
	});

	it("should accumulate and then shift correctly", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 2,
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 3,
		};
		// First accumulate: position becomes 5, path unchanged ([1])
		const i1 = mergeNode_mergeNode(confirmed, toTransform);
		// Now merge at sibling level [0]
		const confirmed2: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const result = mergeNode_mergeNode(confirmed2, i1);
		expect(result).toEqual({ type: "merge_node", path: [0], position: 5 });
	});
});
