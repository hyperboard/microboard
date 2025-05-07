import { removeNode_mergeNode } from "./removeNode_mergeNode";
import { RemoveNodeOperation, MergeNodeOperation } from "slate";

describe("removeNode_mergeNode transformation", () => {
	it("should shift root-level sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1] });
	});

	it("should not shift root-level sibling before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1] });
	});

	it("should shift nested sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1, 1] });
	});

	it("should not shift nested sibling before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1, 1] });
	});

	it("should shift deep nested sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 2],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 3, 0],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [0, 2, 0] });
	});

	it("should shift root-level deeper path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 0],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1, 0] });
	});

	it("should not shift descendant of removed node", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 0, 2],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1, 0, 2] });
	});

	it("should not affect shorter paths", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [0, 1] });
	});

	it("should shift nested sibling at parent level", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 3],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 5, 1],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [2, 4, 1] });
	});

	it("should not shift nested sibling when before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 3],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 2, 4],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [2, 2, 4] });
	});

	it("should not drop merge on equal paths", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1] });
	});

	it("should preserve position property", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: MergeNodeOperation & any = {
			type: "merge_node",
			path: [2],
			position: 99,
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], position: 99 });
	});

	it("should preserve extra properties", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: MergeNodeOperation & any = {
			type: "merge_node",
			path: [2],
			meta: true,
		};
		const result = removeNode_mergeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "merge_node", path: [1], meta: true });
	});

	it("should handle chained removals correctly", () => {
		const r1: RemoveNodeOperation = { type: "remove_node", path: [1] };
		const r2: RemoveNodeOperation = { type: "remove_node", path: [0] };
		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 1],
		};
		const i1 = removeNode_mergeNode(r1, toTransform);
		const result = removeNode_mergeNode(r2, i1);
		expect(result).toEqual({ type: "merge_node", path: [0, 1] });
	});

	it("should handle batch operations", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const ops: MergeNodeOperation[] = [
			{ type: "merge_node", path: [1] },
			{ type: "merge_node", path: [2] },
		];
		const results = ops.map(op => removeNode_mergeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "merge_node", path: [0] },
			{ type: "merge_node", path: [1] },
		]);
	});
});
