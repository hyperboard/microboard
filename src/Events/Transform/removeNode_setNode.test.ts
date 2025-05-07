import { removeNode_setNode } from "./removeNode_setNode";
import { RemoveNodeOperation, SetNodeOperation } from "slate";

describe("removeNode_setNode transformation", () => {
	it("should drop set_node when paths equal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: { a: 1 },
			newProperties: { b: 2 },
		};

		const result = removeNode_setNode(confirmed, toTransform);
		expect(result).toBeUndefined();
	});

	it("should shift root-level sibling set_node after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result.path).toEqual([1]);
	});

	it("should not shift root-level set_node before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result.path).toEqual([1]);
	});

	it("should shift nested first index for non-ancestor branch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result.path).toEqual([0, 2]);
	});

	it("should not shift set_node on a different branch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0, 1],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result.path).toEqual([0, 1]);
	});

	it("should shift nested sibling indices after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result.path).toEqual([1, 1]);
	});

	it("should drop set_node when remove path equals nested path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: { x: 1 },
			newProperties: { y: 2 },
		};

		const result = removeNode_setNode(confirmed, toTransform);
		expect(result).toBeUndefined();
	});

	it("should chain multiple removals correctly", () => {
		const r1: RemoveNodeOperation = { type: "remove_node", path: [1] };
		const r2: RemoveNodeOperation = { type: "remove_node", path: [0] };
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 1],
			properties: {},
			newProperties: {},
		};

		const i1 = removeNode_setNode(r1, toTransform)!;
		const result = removeNode_setNode(r2, i1)!;
		expect(result.path).toEqual([0, 1]);
	});

	it("should preserve additional properties on SetNodeOperation", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
			extra: true,
		} as any;

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result.extra).toBe(true);
	});

	it("should not shift deeply nested descendants beyond prefix", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 0, 2],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result.path).toEqual([1, 0, 2]);
	});

	it("should shift sibling of nested child removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 1],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result.path).toEqual([1, 0]);
	});

	it("should handle batch operations", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const ops: SetNodeOperation[] = [
			{ type: "set_node", path: [1], properties: {}, newProperties: {} },
			{ type: "set_node", path: [2], properties: {}, newProperties: {} },
		];

		const results = ops.map(op => removeNode_setNode(confirmed, op));
		expect(results).toEqual([
			{ type: "set_node", path: [0], properties: {}, newProperties: {} },
			{ type: "set_node", path: [1], properties: {}, newProperties: {} },
		]);
	});

	it("should shift nested sibling indices at depth 1", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 3],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 4, 5],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result).toEqual({
			type: "set_node",
			path: [2, 3, 5],
			properties: {},
			newProperties: {},
		});
	});

	it("should not shift for nested lower index on same branch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 2],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0, 1, 5],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result).toEqual({
			type: "set_node",
			path: [0, 1, 5],
			properties: {},
			newProperties: {},
		});
	});

	it("should not affect operations with shorter paths", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0, 1],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result).toEqual({
			type: "set_node",
			path: [0, 1],
			properties: {},
			newProperties: {},
		});
	});

	it("should shift root-level sibling even when toTransform has deeper path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 0],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 0],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result).toEqual({
			type: "set_node",
			path: [1, 0],
			properties: {},
			newProperties: {},
		});
	});

	it("should shift nested sibling indices at deeper depth", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2, 3],
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2, 4],
			properties: {},
			newProperties: {},
		};

		const result = removeNode_setNode(confirmed, toTransform)!;
		expect(result).toEqual({
			type: "set_node",
			path: [1, 2, 3],
			properties: {},
			newProperties: {},
		});
	});
});
