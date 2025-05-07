import { removeNode_splitNode } from "./removeNode_splitNode";
import { RemoveNodeOperation, SplitNodeOperation } from "slate";

describe("removeNode_splitNode transformation", () => {
	it("should shift root-level sibling paths after remove_node", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		});
	});

	it("should not shift root-level nodes before remove_node", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		});
	});

	it("should shift nested first index for non-ancestor branch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 2,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 2],
			position: 2,
			properties: {},
		});
	});

	it("should not shift nested nodes before remove_node on different branch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 3,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 1],
			position: 3,
			properties: {},
		});
	});

	it("should shift nested sibling indices after remove_node", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 1,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 1],
			position: 1,
			properties: {},
		});
	});

	it("should not shift same node path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		});
	});

	it("should chain multiple remove_node operations correctly", () => {
		const first: RemoveNodeOperation = { type: "remove_node", path: [1] };
		const second: RemoveNodeOperation = { type: "remove_node", path: [0] };
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1],
			position: 2,
			properties: {},
		};

		const r1 = removeNode_splitNode(first, toTransform);
		const result = removeNode_splitNode(second, r1);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 1],
			position: 2,
			properties: {},
		});
	});

	it("should preserve additional properties on SplitNodeOperation", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
			extra: true,
		} as any;

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result.extra).toBe(true);
		expect(result.path).toEqual([1]);
	});

	it("should not shift deeply nested descendants beyond prefix", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0, 2],
			position: 1,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 0, 2],
			position: 1,
			properties: {},
		});
	});

	it("should shift sibling of nested child removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 3,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 3,
			properties: {},
		});
	});

	it("should handle multiple siblings in batch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const ops: SplitNodeOperation[] = [
			{ type: "split_node", path: [1], position: 0, properties: {} },
			{ type: "split_node", path: [2], position: 1, properties: {} },
			{ type: "split_node", path: [3], position: 2, properties: {} },
		];

		const results = ops.map(op => removeNode_splitNode(confirmed, op));
		expect(results).toEqual([
			{ type: "split_node", path: [0], position: 0, properties: {} },
			{ type: "split_node", path: [1], position: 1, properties: {} },
			{ type: "split_node", path: [2], position: 2, properties: {} },
		]);
	});

	it("should not shift removal at nested descendant operation", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2, 3],
			position: 2,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 2, 3],
			position: 2,
			properties: {},
		});
	});

	it("should shift multi-level root sibling descendant", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 0, 3],
			position: 4,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 0, 3],
			position: 4,
			properties: {},
		});
	});

	it("should shift nested sibling at deeper level", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 3],
			position: 1,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 2],
			position: 1,
			properties: {},
		});
	});

	it("should not shift for non-ancestor complex branch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 1],
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 0, 5],
			position: 2,
			properties: {},
		};

		const result = removeNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 0, 5],
			position: 2,
			properties: {},
		});
	});
});
