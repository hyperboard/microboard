import { moveNode_removeNode } from "./moveNode_removeNode";
import { MoveNodeOperation, RemoveNodeOperation } from "slate";

describe("moveNode_removeNode transformation", () => {
	it("should not change path when moving in a different branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [4],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [4],
		});
	});

	it("should shift sibling before removal at root", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [1], // 2 > 1 ⇒ 1
		});
	});

	it("should shift sibling after insertion at root", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [4],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [4], // removal:4>1⇒3, insertion at3:3≥3⇒4
		});
	});

	it("should remap equal sibling at move path", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [0],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [0], // exact match ⇒ remap to newPath
		});
	});

	it("should remap descendant of moved subtree", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [4],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 5],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [4, 5], // [1,5] → [4,5]
		});
	});

	it("should shift nested sibling under same parent", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [0, 3],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 2],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [0, 1], // 2 > 1 ⇒ 1
		});
	});

	it("should shift deeper sibling under same parent", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [1, 2],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [1, 0], // 1 < 2 ⇒ 0
		});
	});

	it("should remap nested descendant at deeper depth", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [2, 2],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0, 2],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [2, 2, 2], // head moved to [2,2], tail preserved
		});
	});

	it("should not change ancestor paths above the move", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2, 1],
			newPath: [0, 4],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [2], // ancestor → unchanged
		});
	});

	it("should handle removal at root index zero", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [2],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [0], // 1 > 0 ⇒ 0
		});
	});

	it("should preserve custom properties", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [3],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).toEqual({
			type: "remove_node",
			path: [3],
		});
	});

	it("should not mutate the original operation object", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [1],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const copy = { ...original, path: [...original.path] };
		moveNode_removeNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should not shift deeper sibling", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [2],
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [3],
		};
		const result = moveNode_removeNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(result).toEqual({
			type: "remove_node",
			path: [3],
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
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [4],
		};
		const r1 = moveNode_removeNode(m1, original); // 4>1⇒3 then ≥3⇒4
		const r2 = moveNode_removeNode(m2, r1); // 4>2⇒3 then ≥0⇒4
		expect(r2).toEqual({
			type: "remove_node",
			path: [4],
		});
	});

	it("should handle batch operations correctly", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const ops: RemoveNodeOperation[] = [
			{ type: "remove_node", path: [0] },
			{ type: "remove_node", path: [1] },
			{ type: "remove_node", path: [3] },
		];
		const results = ops.map(op => moveNode_removeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "remove_node", path: [0] }, // 0<1: no shift
			{ type: "remove_node", path: [2] }, // 1==1: remap to newPath
			{ type: "remove_node", path: [3] }, // removal 3>1⇒2 then insertion 2≥2⇒3
		]);
	});
});
