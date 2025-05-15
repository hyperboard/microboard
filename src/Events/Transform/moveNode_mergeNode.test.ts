import { moveNode_mergeNode } from "./moveNode_mergeNode";
import { MoveNodeOperation, MergeNodeOperation } from "slate";

describe("moveNode_mergeNode transformation", () => {
	it("should not change path or position when moving in a different branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 4,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [1],
			position: 4,
		});
	});

	it("should shift sibling before removal at root", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 5,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [1], // 2 > 1 → 1
			position: 5,
		});
	});

	it("should shift sibling after insertion at root", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [4],
			position: 2,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [4], // removal: 4 > 1 → 3, insertion at 3: 3 ≥ 3 → 4, so stays 4
			position: 2,
		});
	});

	it("should shift equal sibling at merge path", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [0],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 3,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [0],
			position: 3,
		});
	});

	it("should remap descendant of moved subtree", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [4],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 5],
			position: 1,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [4, 5], // [1,5] → [4,5]
			position: 1,
		});
	});

	it("should shift nested sibling under same parent", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [0, 3],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2],
			position: 0,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1], // sibling at index 2 > 1 → 1
			position: 0,
		});
	});

	it("should shift descendant of removed subtree", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [2, 0],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 0, 2],
			position: 3,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [2, 0, 2], // inside moved node but deeper => unchanged
			position: 3,
		});
	});

	it("should handle ancestor paths above the move", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2, 1],
			newPath: [0, 4],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 2,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [2], // first segment equal, unchanged
			position: 2,
		});
	});

	it("should preserve position value", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [1],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 7,
			properties: {},
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			type: "merge_node",
			path: [2],
			position: 7,
			properties: {},
		});
	});

	it("should preserve custom properties", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [3],
			position: 5,
			properties: {},
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).toEqual({
			properties: {},
			type: "merge_node",
			path: [3],
			position: 5,
		});
	});

	it("should not mutate the original operation object", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [1],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 3,
		};
		const copy = { ...original, path: [...original.path] };
		moveNode_mergeNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should return a new instance", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [4],
			position: 1,
		};
		const result = moveNode_mergeNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(result).toEqual({
			type: "merge_node",
			path: [4], // 4 > 1 →3, insertion at 3:3 ≥3 →4
			position: 1,
		});
	});

	it("should chain multiple move operations", () => {
		const m1: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const m2: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [0],
		};
		const original: MergeNodeOperation = {
			type: "merge_node",
			path: [4],
			position: 2,
		};
		const r1 = moveNode_mergeNode(m1, original);
		const r2 = moveNode_mergeNode(m2, r1);
		expect(r2).toEqual({
			type: "merge_node",
			path: [4],
			position: 2,
		});
	});

	it("should handle batch operations correctly", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const ops: MergeNodeOperation[] = [
			{ type: "merge_node", path: [0], position: 0 },
			{ type: "merge_node", path: [1], position: 1 },
			{ type: "merge_node", path: [3], position: 2 },
		];
		const results = ops.map(op => moveNode_mergeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "merge_node", path: [0], position: 0 }, // 0<1: no shift
			{ type: "merge_node", path: [2], position: 1 }, // 1===1 → remap to newPath
			{ type: "merge_node", path: [3], position: 2 }, // 3>1 → remap removal to 2 then insertion back to 3
		]);
	});
});
