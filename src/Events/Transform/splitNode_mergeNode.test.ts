import { splitNode_mergeNode } from "./splitNode_mergeNode";
import { SplitNodeOperation, MergeNodeOperation } from "slate";

describe("splitNode_mergeNode transformation", () => {
	it("should decrement position when same path and confirmed.position <= toTransform.position", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 5,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 3 });
	});

	it("should not change position when same path and confirmed.position > toTransform.position", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 6,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 4,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 4 });
	});

	it("should shift sibling path indices after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 1,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [3], position: 1 });
	});

	it("should not shift sibling indices before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 1,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 1 });
	});

	it("should shift nested descendant paths after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 3,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [2, 2],
			position: 3,
		});
	});

	it("should not shift paths for non-descendant branches", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 5],
			position: 2,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [0, 5],
			position: 2,
		});
	});

	it("should shift multiple sibling paths correctly", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransforms: MergeNodeOperation[] = [
			{ type: "merge_node", path: [1], position: 1 },
			{ type: "merge_node", path: [2], position: 2 },
			{ type: "merge_node", path: [3], position: 3 },
		];

		const results = toTransforms.map(op =>
			splitNode_mergeNode(confirmed, op),
		);
		expect(results).toEqual([
			{ type: "merge_node", path: [2], position: 1 },
			{ type: "merge_node", path: [3], position: 2 },
			{ type: "merge_node", path: [4], position: 3 },
		]);
	});

	it("should decrement nested same-path position", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 3,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 0],
			position: 5,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 0],
			position: 2,
		});
	});

	it("should shift nested descendant deeper path segments", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 0, 2],
			position: 1,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 1, 2],
			position: 1,
		});
	});

	it("should not mutate the original toTransform operation", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 3,
		};
		const original = { ...toTransform };

		splitNode_mergeNode(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});

	it("should zero position when same path and confirmed.position equals toTransform.position", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 3,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 3,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [2], position: 0 });
	});

	it("should shift descendant of root-level split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 4,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [2, 1],
			position: 4,
		});
	});

	it("should shift nested sibling after nested split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 3],
			position: 2,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 4],
			position: 2,
		});
	});

	it("should shift root-level descendant for nested merge", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 5],
			position: 1,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 5],
			position: 1,
		});
	});

	it("should not modify when confirmed path is after merge path", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 3,
		};

		const result = splitNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "merge_node",
			path: [1, 2],
			position: 3,
		});
	});
});
