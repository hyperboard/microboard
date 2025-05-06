import { setNode_removeNode } from "./setNode_removeNode";
import { SetNodeOperation, RemoveNodeOperation } from "slate";

describe("setNode_removeNode transformation (no-path-shift)", () => {
	it("should not shift path for root-level node after set_node", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.path).toEqual([2]);
	});

	it("should not shift path for root-level node before set_node", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.path).toEqual([1]);
	});

	it("should not shift nested non-ancestor path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 2]);
	});

	it("should not shift direct child path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 0]);
	});

	it("should not shift parent path when setting its child", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1, 0],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.path).toEqual([1]);
	});

	it("should not shift deep descendant path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0, 2],
		};

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 0, 2]);
	});

	it("should preserve additional properties on RemoveNodeOperation", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
			node: { id: 5 },
		} as any;

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.node).toEqual({ id: 5 });
	});

	it("should not mutate original operation", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [3],
		};
		const original = { ...toTransform, path: [...toTransform.path] };

		setNode_removeNode(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});

	it("should preserve type", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.type).toBe("remove_node");
	});

	it("should handle batch operations without shift", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const ops: RemoveNodeOperation[] = [
			{ type: "remove_node", path: [3] },
			{ type: "remove_node", path: [4] },
		];
		const results = ops.map(op => setNode_removeNode(confirmed, op));
		expect(results.map(r => r.path)).toEqual([[3], [4]]);
	});

	it("should chain multiple set_node calls without shift", () => {
		const setA: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const setB: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 1],
		};

		const r1 = setNode_removeNode(setA, toTransform);
		const result = setNode_removeNode(setB, r1);
		expect(result.path).toEqual([2, 1]);
	});

	it("should preserve path when confirmed.path equals toTransform.path prefix but not ancestor exactly", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};

		const result = setNode_removeNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 1]);
	});
});
