import { removeNode_moveNode } from "./removeNode_moveNode";
import { RemoveNodeOperation, MoveNodeOperation } from "slate";

describe("removeNode_moveNode transformation", () => {
	it("should not change paths when removing in a different branch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
		});
	});

	it("should shift root-level sibling paths when removing at root", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
		});
	});

	it("should not shift when removing at the same index (equal sibling)", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [1],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [1],
		});
	});

	it("should shift only newPath when only newPath is a sibling", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [2],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [0],
			newPath: [1],
		});
	});

	it("should not shift deeper descendant of the removed node", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [1, 2],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 0],
			newPath: [1, 2],
		});
	});

	it("should shift deeper siblings under the same parent", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [1, 3],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 1], // sibling at index 2 → 1
			newPath: [1, 2], // newPath at 3 → 2
		});
	});

	it("should not shift when deep sibling index equals removal index", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [1, 0],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 0],
			newPath: [1, 0],
		});
	});

	it("should not shift branch outside parent for nested removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 1],
			newPath: [2, 2],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 1],
			newPath: [2, 2],
		});
	});

	it("should preserve custom properties on MoveNodeOperation", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const original: MoveNodeOperation & any = {
			type: "move_node",
			path: [2],
			newPath: [3],
			foo: "bar",
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
			foo: "bar",
		});
	});

	it("should not mutate the original operation object", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
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
		removeNode_moveNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should accumulate shifts when chaining removeNode operations at root", () => {
		const r1: RemoveNodeOperation = { type: "remove_node", path: [1] };
		const r2: RemoveNodeOperation = { type: "remove_node", path: [1] };
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [4],
		};
		const first = removeNode_moveNode(r1, original); // 3→2, 4→3
		const second = removeNode_moveNode(r2, first); // 2→1, 3→2
		expect(second).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
		});
	});

	it("should handle batch operations without altering unaffected moves", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const ops: MoveNodeOperation[] = [
			{ type: "move_node", path: [0], newPath: [0] },
			{ type: "move_node", path: [1], newPath: [1] },
			{ type: "move_node", path: [2], newPath: [2] },
		];
		const results = ops.map(op => removeNode_moveNode(confirmed, op));
		expect(results).toEqual([
			{ type: "move_node", path: [0], newPath: [0] },
			{ type: "move_node", path: [1], newPath: [1] },
			{ type: "move_node", path: [1], newPath: [1] },
		]);
	});

	it("should not shift newPath for deep descendant of deeper removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [1, 0, 5],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3],
			newPath: [1, 0, 5],
		});
	});

	it("should not change when removing at index 0", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [1],
		};
		const result = removeNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [0], // 1>0: shift →0
			newPath: [0], // 1>0: shift →0
		});
	});
});
