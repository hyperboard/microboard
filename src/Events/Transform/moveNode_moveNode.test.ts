import { moveNode_moveNode } from "./moveNode_moveNode";
import { MoveNodeOperation } from "slate";

describe("moveNode_moveNode transformation", () => {
	it("should not change paths when moving in a different branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [4],
			newPath: [5],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [4],
			newPath: [5],
		});
	});

	it("should adjust both path and newPath when sibling before removal", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [4],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1], // 2 > 1 ⇒ 1
			newPath: [4], // 4 > 1 ⇒ 3, then 3 ≥ 3 ⇒ 4
		});
	});

	it("should adjust path only when newPath is before removal", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [5],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [1],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2], // 3 > 2 ⇒ 2
			newPath: [1], // 1 < 2 ⇒ 1
		});
	});

	it("should adjust newPath only when sibling after insertion", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [4],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1], // 1 < 2 ⇒ 1
			newPath: [2], // 3 > 2 ⇒ 2
		});
	});

	it("should remap when toTransform.path equals confirmed.path", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [6],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [5],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [6], // exactly moved
			newPath: [4], // 5 > 3 ⇒ 4, then 4 < 6 ⇒ stays 4
		});
	});

	it("should remap when toTransform.newPath equals confirmed.path", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [6],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [6], // newPath exactly equals confirmed.path ⇒ remapped to confirmed.newPath
		});
	});

	it("should remap nested descendant of moved subtree", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [2, 2],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0, 3],
			newPath: [1, 0, 4],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 2, 3],
			newPath: [2, 2, 4],
		});
	});

	it("should shift nested sibling under same parent", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 1],
			newPath: [3, 0],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2, 1],
			newPath: [1, 2, 3],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 1, 1], // 2 > 1 ⇒ 1
			newPath: [1, 1, 3], // newPath: [1,2,3] → [1,1,3]
		});
	});

	it("should not shift deeper siblings", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [4],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3],
			newPath: [4],
		});
	});

	it("should not mutate the original operation object", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [1],
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
		moveNode_moveNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should return a new instance", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [2],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [5],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(result).toEqual({
			type: "move_node",
			path: [3], // 3 > 0 ⇒ 2, then 2 ≥ 2 ⇒ 3
			newPath: [5],
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
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [4],
			newPath: [6],
		};
		const r1 = moveNode_moveNode(m1, original);
		const r2 = moveNode_moveNode(m2, r1);
		expect(r2).toEqual({
			type: "move_node",
			path: [4], // r1.path [4] → removal@2:4>2⇒3 → insertion@0:3≥0⇒4
			newPath: [6],
		});
	});

	it("should handle batch operations without affecting unaffected", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const ops: MoveNodeOperation[] = [
			{ type: "move_node", path: [0], newPath: [1] },
			{ type: "move_node", path: [1], newPath: [3] },
			{ type: "move_node", path: [3], newPath: [4] },
		];
		const results = ops.map(op => moveNode_moveNode(confirmed, op));
		expect(results).toEqual([
			{ type: "move_node", path: [0], newPath: [2] }, // 0 < 1 ⇒ 0
			{ type: "move_node", path: [2], newPath: [3] }, // 1 == 1 ⇒ 2
			{ type: "move_node", path: [3], newPath: [4] }, // 3 > 1: removal⇒2, insertion⇒3
		]);
	});

	it("should not change ancestor paths above the move", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2, 1],
			newPath: [4, 0],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [5],
		};
		const result = moveNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [5],
		});
	});
});
