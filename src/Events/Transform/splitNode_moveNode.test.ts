import { splitNode_moveNode } from "./splitNode_moveNode";
import { SplitNodeOperation, MoveNodeOperation } from "slate";

describe("splitNode_moveNode transformation", () => {
	it("should not change paths when splitting in a different branch", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 2,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
		});
	});

	it("should shift root-level sibling paths when splitting at root", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3],
			newPath: [4],
		});
	});

	it("should shift when splitting at the same index (equal sibling)", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [1],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [2],
		});
	});

	it("should shift root-level descendants of the split node", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [1, 5],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 0],
			newPath: [2, 3],
		});
	});

	it("should not shift deeper descendants of a deeper split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 1,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0, 2],
			newPath: [1, 0, 4],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 1, 1], // ? subtract position?
			newPath: [1, 1, 3],
		});
	});

	it("should not shift root-level siblings when split is deeper", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 3,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2], // no shift, different parent level
			newPath: [3],
		});
	});

	it("should shift equal siblings at deeper index", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [1, 0],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 1], // equal sibling at depth 2 shifts 0→1
			newPath: [1, 1],
		});
	});

	it("should preserve custom properties on MoveNodeOperation", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		};
		const original: MoveNodeOperation & any = {
			type: "move_node",
			path: [2],
			newPath: [3],
			foo: "bar",
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3],
			newPath: [4],
			foo: "bar",
		});
	});

	it("should shift even when split position is zero", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3],
			newPath: [4],
		});
	});

	it("should shift only newPath when only newPath is a sibling", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 2,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [3],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [0],
			newPath: [4], // 3→4 at root-level sibling
		});
	});

	it("should chain multiple splits cumulatively", () => {
		const s1: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const s2: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [4],
		};
		const r1 = splitNode_moveNode(s1, original);
		const r2 = splitNode_moveNode(s2, r1);
		expect(r2).toEqual({
			type: "move_node",
			path: [5], // 3→4→5
			newPath: [6], // 4→5→6
		});
	});

	it("should handle batch operations without altering unaffected moves", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const ops: MoveNodeOperation[] = [
			{ type: "move_node", path: [0], newPath: [1] },
			{ type: "move_node", path: [1], newPath: [2] },
			{ type: "move_node", path: [2], newPath: [3] },
		];
		const results = ops.map(op => splitNode_moveNode(confirmed, op));
		expect(results).toEqual([
			{ type: "move_node", path: [0], newPath: [2] },
			{ type: "move_node", path: [2], newPath: [3] }, // 1===1: shift →2,3
			{ type: "move_node", path: [3], newPath: [4] }, // 2>1: shift →3,4
		]);
	});

	it("should not shift newPath for deep descendant of deeper split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 2,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [1, 0, 5],
		};
		const result = splitNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3],
			newPath: [1, 1, 3], // ?
		});
	});

	it("should not mutate the original operation object", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 1,
			properties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const copy = {
			...original,
			path: [...original.path],
			newPath: [...original.newPath],
		};

		splitNode_moveNode(confirmed, original);
		expect(original).toEqual(copy);
	});
});
