import { setNode_moveNode } from "./setNode_moveNode";
import { SetNodeOperation, MoveNodeOperation } from "slate";

describe("setNode_moveNode transformation", () => {
	it("should not change path or newPath for simple set_node", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
		});
	});

	it("should not change when toTransform path index less than set path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [3],
		});
	});

	it("should not change when toTransform path index equals set path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [4],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [4],
		});
	});

	it("should not change when toTransform path index greater than set path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [5],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3],
			newPath: [5],
		});
	});

	it("should not change when toTransform newPath index less than set path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [4],
			newPath: [1],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [4],
			newPath: [1],
		});
	});

	it("should not change when toTransform newPath index equals set path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [3],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [5],
			newPath: [3],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [5],
			newPath: [3],
		});
	});

	it("should not change when toTransform newPath index greater than set path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [2],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [0],
			newPath: [2],
		});
	});

	it("should not change nested paths on a different branch", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1, 0],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 1],
			newPath: [3, 2],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 1],
			newPath: [3, 2],
		});
	});

	it("should not change nested sibling under the same parent", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2, 1],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 3],
			newPath: [2, 4],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 3],
			newPath: [2, 4],
		});
	});

	it("should not change nested descendant", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2, 1],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 1, 0],
			newPath: [2, 1, 1],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 1, 0],
			newPath: [2, 1, 1],
		});
	});

	it("should not change branch outside parent", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2, 1],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3, 0],
			newPath: [3, 1],
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3, 0],
			newPath: [3, 1],
		});
	});

	it("should preserve custom MoveNodeOperation properties", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation & any = {
			type: "move_node",
			path: [1],
			newPath: [2],
			customFlag: true,
		};
		const result = setNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
			customFlag: true,
		});
	});

	it("should not mutate the original operation object", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
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

		setNode_moveNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should remain unchanged when chaining multiple set_node operations", () => {
		const s1: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const s2: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [4],
		};
		const r1 = setNode_moveNode(s1, original);
		const r2 = setNode_moveNode(s2, r1);
		expect(r2).toEqual({
			type: "move_node",
			path: [3],
			newPath: [4],
		});
	});

	it("should handle batch operations without altering any moves", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const ops: MoveNodeOperation[] = [
			{ type: "move_node", path: [0], newPath: [0] },
			{ type: "move_node", path: [1], newPath: [1] },
			{ type: "move_node", path: [2], newPath: [2] },
		];
		const results = ops.map(op => setNode_moveNode(confirmed, op));
		expect(results).toEqual([
			{ type: "move_node", path: [0], newPath: [0] },
			{ type: "move_node", path: [1], newPath: [1] },
			{ type: "move_node", path: [2], newPath: [2] },
		]);
	});
});
