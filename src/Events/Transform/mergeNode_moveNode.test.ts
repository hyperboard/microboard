import { mergeNode_moveNode } from "./mergeNode_moveNode";
import { MergeNodeOperation, MoveNodeOperation } from "slate";

describe("mergeNode_moveNode transformation", () => {
	it("should not change paths when merging in a different branch", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
		});
	});

	it("should not shift when sibling index less than merge index at root", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [1],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [1],
		});
	});

	it("should shift when merging at the same index (equal sibling)", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [2],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [1],
		});
	});

	it("should shift when sibling index greater than merge index at root", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [4],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2], // 3 → 2
			newPath: [3], // 4 → 3
		});
	});

	it("should shift nested sibling under same parent", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [1, 5],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [0, 2], // descendant of removed root 1: unchanged
			newPath: [0, 5], // same logic
		});
	});

	it("should shift nested sibling at merge depth", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 3],
			newPath: [1, 4],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 2], // 3 → 2 under the same parent [1]
			newPath: [1, 3], // 4 → 3 under the same parent [1]
		});
	});

	it("should not shift deeper descendants of a deeper merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2, 0],
			newPath: [1, 2, 3],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 1, 0],
			newPath: [1, 1, 3],
		});
	});

	it("should not shift branch outside parent for nested merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 0],
			newPath: [2, 1],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 0],
			newPath: [2, 1],
		});
	});

	it("should shift newPath sibling under same parent at merge depth", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [3],
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [0], // 0 < 2: unchanged
			newPath: [2], // 3 → 2 at root-level sibling
		});
	});

	it("should preserve custom properties on MoveNodeOperation", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const original: MoveNodeOperation & any = {
			type: "move_node",
			path: [2],
			newPath: [3],
			foo: "bar",
		};
		const result = mergeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1], // 2 → 1
			newPath: [2], // 3 → 2
			foo: "bar",
		});
	});

	it("should not mutate the original operation object", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const copy = {
			...original,
			path: [...original.path],
			newPath: [...original.newPath],
		};
		mergeNode_moveNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should accumulate shifts when chaining merge operations at root", () => {
		const m1: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const m2: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [4],
		};
		const r1 = mergeNode_moveNode(m1, original); // 3→2, 4→3
		const r2 = mergeNode_moveNode(m2, r1); // 2→1, 3→2
		expect(r2).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
		});
	});

	it("should handle batch operations without altering unaffected moves", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const ops: MoveNodeOperation[] = [
			{ type: "move_node", path: [0], newPath: [0] },
			{ type: "move_node", path: [1], newPath: [1] },
			{ type: "move_node", path: [2], newPath: [2] },
		];
		const results = ops.map(op => mergeNode_moveNode(confirmed, op));
		expect(results).toEqual([
			{ type: "move_node", path: [0], newPath: [0] },
			{ type: "move_node", path: [0], newPath: [0] },
			{ type: "move_node", path: [1], newPath: [1] },
		]);
	});
});
