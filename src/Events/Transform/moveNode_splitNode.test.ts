import { moveNode_splitNode } from "./moveNode_splitNode";
import { MoveNodeOperation, SplitNodeOperation } from "slate";

describe("moveNode_splitNode transformation", () => {
	it("should not change path when moving in a different branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [4],
			position: 1,
			properties: { foo: "bar" },
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [4],
			position: 1,
			properties: { foo: "bar" },
		});
	});

	it("should shift path when sibling before removal at root", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [1], // 2 > 1 ⇒ 1
			position: 0,
			properties: {},
		});
	});

	it("should shift path back when sibling after insertion at root", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [4],
			position: 2,
			properties: { x: true },
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [4], // removal:4>1⇒3, insertion at3:3 ≥3⇒4
			position: 2,
			properties: { x: true },
		});
	});

	it("should remap equal sibling at move path", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [0],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 1,
			properties: { a: 1 },
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [0], // exact match ⇒ remap to newPath
			position: 1,
			properties: { a: 1 },
		});
	});

	it("should remap descendant of moved subtree", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [4],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [1, 5],
			position: 2,
			properties: { b: 2 },
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [4, 5], // [1,5] → [4,5]
			position: 2,
			properties: { b: 2 },
		});
	});

	it("should remap deep descendant of moved subtree", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [2, 2],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0, 3],
			position: 3,
			properties: {},
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 2, 3], // [1,0]→[2,2], then tail [3]
			position: 3,
			properties: {},
		});
	});

	it("should not change outside branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [2, 0],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [0, 2],
			position: 1,
			properties: { c: 3 },
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 2],
			position: 1,
			properties: { c: 3 },
		});
	});

	it("should not change ancestor above move", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2, 1],
			newPath: [0, 4],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		});
	});

	it("should preserve position value", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [1],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 5,
			properties: { d: 4 },
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).toEqual({
			type: "split_node",
			path: [2], // removal:2>0⇒1, insertion:1 ≥1⇒2
			position: 5,
			properties: { d: 4 },
		});
	});

	it("should preserve properties object identity", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const props = { e: 5 };
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [3],
			position: 7,
			properties: props,
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result.properties).toBe(props);
		expect(result.position).toBe(7);
	});

	it("should not mutate the original operation object", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [1],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 6,
			properties: { f: 6 },
		};
		const copy = {
			...original,
			path: [...original.path],
			properties: { ...original.properties },
		};
		moveNode_splitNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should return a new instance", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [2],
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [3],
			position: 9,
			properties: {},
		};
		const result = moveNode_splitNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(result).toEqual({
			type: "split_node",
			path: [3], // removal:3>0⇒2, insertion:2 ≥2⇒3
			position: 9,
			properties: {},
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
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [4],
			position: 1,
			properties: { g: 7 },
		};
		const r1 = moveNode_splitNode(m1, original);
		const r2 = moveNode_splitNode(m2, r1);
		expect(r2).toEqual({
			type: "split_node",
			path: [4], // r1:4>1⇒3→insertion⇒4; r2:4>2⇒3→insertion⇒3
			position: 1,
			properties: { g: 7 },
		});
	});

	it("should handle batch operations correctly", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const ops: SplitNodeOperation[] = [
			{ type: "split_node", path: [0], position: 0, properties: {} },
			{ type: "split_node", path: [1], position: 1, properties: {} },
			{ type: "split_node", path: [3], position: 2, properties: {} },
		];
		const results = ops.map(op => moveNode_splitNode(confirmed, op));
		expect(results).toEqual([
			{ type: "split_node", path: [0], position: 0, properties: {} }, // 0<1 no shift
			{ type: "split_node", path: [2], position: 1, properties: {} }, // 1==1 remapped→2
			{ type: "split_node", path: [3], position: 2, properties: {} }, // removal 3>1⇒2 then insertion 2<3⇒2
		]);
	});
});
