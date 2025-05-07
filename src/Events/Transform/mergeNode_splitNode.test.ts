import { mergeNode_splitNode } from "./mergeNode_splitNode";
import { MergeNodeOperation, SplitNodeOperation } from "slate";

describe("mergeNode_splitNode transformation", () => {
	it("should shift root-level split after merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 3,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 3,
			properties: {},
		});
	});

	it("should not shift root-level split before merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		});
	});

	it("should shift nested first index after merge at root", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 1,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 2],
			position: 1,
			properties: {},
		});
	});

	it("should not shift split on different branch", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 2,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 1],
			position: 2,
			properties: {},
		});
	});

	it("should shift nested sibling after merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 4,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 1],
			position: 4,
			properties: {},
		});
	});

	it("should not shift nested split before merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 7,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 1],
			position: 7,
			properties: {},
		});
	});

	it("should not shift deep nested descendant beyond prefix", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0, 2],
			position: 2,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 0, 2],
			position: 2,
			properties: {},
		});
	});

	it("should shift sibling of nested child merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 0],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 0,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		});
	});

	it("should add merge position to split position when paths equal", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 2,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 7,
			properties: {},
		});
	});

	it("should chain multiple merges correctly", () => {
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
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1],
			position: 3,
			properties: {},
		};
		const i1 = mergeNode_splitNode(m1, toTransform);
		const result = mergeNode_splitNode(m2, i1);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 1],
			position: 3,
			properties: {},
		});
	});

	it("should handle batch operations", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const ops: SplitNodeOperation[] = [
			{ type: "split_node", path: [1], position: 1, properties: {} },
			{ type: "split_node", path: [2], position: 2, properties: {} },
		];
		const results = ops.map(op => mergeNode_splitNode(confirmed, op));
		expect(results).toEqual([
			{ type: "split_node", path: [0], position: 1, properties: {} },
			{ type: "split_node", path: [1], position: 2, properties: {} },
		]);
	});

	it("should not shift root-level deeper path not affected", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 0],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 0],
			position: 2,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 0],
			position: 2,
			properties: {},
		});
	});

	it("should shift nested sibling at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 5, 1],
			position: 4,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 4, 1],
			position: 4,
			properties: {},
		});
	});

	it("should preserve extra properties on SplitNodeOperation", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: SplitNodeOperation & any = {
			type: "split_node",
			path: [2],
			position: 8,
			properties: {},
			tag: "foo",
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 8,
			properties: {},
			tag: "foo",
		});
	});

	it("should not shift split when transform.path shorter than merge path", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 0,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 4,
			properties: {},
		};
		const result = mergeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 4,
			properties: {},
		});
	});
});
