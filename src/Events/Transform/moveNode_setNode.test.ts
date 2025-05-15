import { moveNode_setNode } from "./moveNode_setNode";
import { MoveNodeOperation, SetNodeOperation } from "slate";

describe("moveNode_setNode transformation", () => {
	it("should not change path when moving in a different branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [4],
			properties: { a: 1 },
			newProperties: { b: 2 },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [4],
			properties: { a: 1 },
			newProperties: { b: 2 },
		});
	});

	it("should shift path when sibling before removal at root", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [1], // 2 > 1 ⇒ 1
			properties: {},
			newProperties: {},
		});
	});

	it("should shift path when sibling after insertion at root", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [4],
			properties: { x: true },
			newProperties: { y: false },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [4], // removal:4>1⇒3, insertion:3≥3⇒4
			properties: { x: true },
			newProperties: { y: false },
		});
	});

	it("should remap equal sibling at move path", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [0],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: { foo: "bar" },
			newProperties: { baz: "qux" },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [0], // exact match ⇒ remap
			properties: { foo: "bar" },
			newProperties: { baz: "qux" },
		});
	});

	it("should remap descendant of moved subtree", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [4],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [1, 5],
			properties: { c: 3 },
			newProperties: { d: 4 },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [4, 5], // [1,5] → [4,5]
			properties: { c: 3 },
			newProperties: { d: 4 },
		});
	});

	it("should shift nested sibling under same parent", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [0, 3],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [0, 2],
			properties: { e: 5 },
			newProperties: { f: 6 },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [0, 1], // 2 > 1 ⇒ 1
			properties: { e: 5 },
			newProperties: { f: 6 },
		});
	});

	it("should not shift when path is ancestor of move", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [1], // ancestor unchanged
			properties: {},
			newProperties: {},
		});
	});

	it("should not shift when path is deeper descendant beyond move", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [2, 0],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [1, 0, 2],
			properties: { z: 9 },
			newProperties: { w: 8 },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 0, 2], // moved subtree head remapped, tail preserved
			properties: { z: 9 },
			newProperties: { w: 8 },
		});
	});

	it("should handle removal at root index zero", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [2],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: { g: true },
			newProperties: { h: false },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [0], // 1 > 0 ⇒ 0
			properties: { g: true },
			newProperties: { h: false },
		});
	});

	it("should handle insertion at root index zero", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [0],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: { p: 7 },
			newProperties: { q: 8 },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).toEqual({
			type: "set_node",
			path: [2], // removal:1<2 no, insertion:1>=0⇒2
			properties: { p: 7 },
			newProperties: { q: 8 },
		});
	});

	it("should preserve custom properties object identity", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const props = { u: 1 };
		const newProps = { v: 2 };
		const original: SetNodeOperation = {
			type: "set_node",
			path: [3],
			properties: props,
			newProperties: newProps,
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result.properties).toBe(props);
		expect(result.newProperties).toBe(newProps);
	});

	it("should not mutate the original operation object", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [1],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: { m: 3 },
			newProperties: { n: 4 },
		};
		const copy = {
			...original,
			path: [...original.path],
			properties: { ...original.properties },
			newProperties: { ...original.newProperties },
		};
		moveNode_setNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should return a new instance", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [2],
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [3],
			properties: { o: 5 },
			newProperties: { p: 6 },
		};
		const result = moveNode_setNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(result).toEqual({
			type: "set_node",
			path: [3],
			properties: { o: 5 },
			newProperties: { p: 6 },
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
		const original: SetNodeOperation = {
			type: "set_node",
			path: [4],
			properties: { x: 9 },
			newProperties: { y: 10 },
		};
		const r1 = moveNode_setNode(m1, original);
		const r2 = moveNode_setNode(m2, r1);
		expect(r2).toEqual({
			type: "set_node",
			path: [4], // r1:4>1⇒3 then ≥3⇒4; r2:4>2⇒3 then ≥0⇒3
			properties: { x: 9 },
			newProperties: { y: 10 },
		});
	});

	it("should handle batch operations correctly", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const ops: SetNodeOperation[] = [
			{ type: "set_node", path: [0], properties: {}, newProperties: {} },
			{ type: "set_node", path: [1], properties: {}, newProperties: {} },
			{ type: "set_node", path: [3], properties: {}, newProperties: {} },
		];
		const results = ops.map(op => moveNode_setNode(confirmed, op));
		expect(results).toEqual([
			{ type: "set_node", path: [0], properties: {}, newProperties: {} }, // 0<1 no shift
			{ type: "set_node", path: [2], properties: {}, newProperties: {} }, // 1==1 ⇒ 2
			{ type: "set_node", path: [3], properties: {}, newProperties: {} }, // removal:3>1⇒2 then insertion:2≥2⇒3
		]);
	});
});
