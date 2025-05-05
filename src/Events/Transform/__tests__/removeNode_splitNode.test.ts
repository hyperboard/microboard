import { RemoveNodeOperation, SplitNodeOperation } from "slate";
import { removeNode_splitNode } from "../removeNode_splitNode";

describe("removeNode_splitNode", () => {
	test("should transform path when affected by removeNode", () => {
		// Scenario: Removing a node at [0, 1] should affect a split at [0, 2, 3]
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
			node: { text: "removed" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 2, 3],
			position: 5,
			properties: {},
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// After removal, [0, 2, 3] should become [0, 1, 3]
		expect(result.path).toEqual([0, 1, 3]);
		expect(result.position).toBe(5); // Position should remain unchanged
		expect(result.properties).toEqual({});
	});

	test("should not transform path when not affected by removeNode", () => {
		// Scenario: Removing a node at [1, 0] should not affect a split at [0, 1, 2]
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
			node: { text: "removed" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1, 2],
			position: 3,
			properties: {},
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// Path should remain unchanged
		expect(result.path).toEqual([0, 1, 2]);
		expect(result.position).toBe(3);
	});

	test("should handle operation on the same path", () => {
		// Scenario: Removing the exact node being split
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
			node: { text: "removed" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1, 2],
			position: 3,
			properties: {},
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// This is a special case - the split operation would be operating on a removed node
		// The transformation logic should handle this appropriately
		expect(result).toBeDefined();
		// The exact behavior might need to be specified based on your implementation
	});

	test("should preserve splitNode properties in the transformed operation", () => {
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 0],
			node: { text: "removed" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 5,
			properties: { key: "value", another: 123 },
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// Path should be transformed, but properties should be preserved
		expect(result.path).toEqual([0, 0]);
		expect(result.position).toBe(5);
		expect(result.properties).toEqual({ key: "value", another: 123 });
	});

	test("should handle removal at deeper level than split path", () => {
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2, 3],
			node: { text: "deep node" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 2,
			properties: {},
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// Split path should remain unchanged as the removal is at a deeper level
		expect(result.path).toEqual([0, 1]);
	});

	test("should handle removal at sibling node", () => {
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 2],
			node: { text: "sibling" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 2],
			position: 3,
			properties: {},
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// The split would be targeting a removed node
		expect(result.path).toEqual([0, 2]);
	});

	test("should handle removal of a parent of the split node", () => {
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
			node: { children: [{ text: "child" }] },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1, 0],
			position: 3,
			properties: {},
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// This is a special case - the split operation would be on a child of a removed node
		// The exact behavior depends on implementation, but we should get a defined result
		expect(result).toBeDefined();
	});

	test("should handle multiple level path adjustments", () => {
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
			node: { children: [] },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2, 3],
			position: 5,
			properties: {},
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// After removal of node at [0], [1, 2, 3] should become [0, 2, 3]
		expect(result.path).toEqual([0, 2, 3]);
	});

	test("should handle removal at first index", () => {
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 0],
			node: { text: "first" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 3,
			properties: {},
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// After removal of node at [0, 0], [0, 1] should become [0, 0]
		expect(result.path).toEqual([0, 0]);
	});

	test("should handle complex nested path scenarios", () => {
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
			node: { text: "complex" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [1, 3, 0, 1],
			position: 7,
			properties: { custom: true },
		};

		const result = removeNode_splitNode(removeOp, splitOp);

		// After removal, [1, 3, 0, 1] should become [1, 2, 0, 1]
		expect(result.path).toEqual([1, 2, 0, 1]);
		expect(result.position).toBe(7);
		expect(result.properties).toEqual({ custom: true });
	});

	test("should not modify the original split operation", () => {
		const removeOp: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
			node: { text: "something" },
		};

		const splitOp: SplitNodeOperation = {
			type: "split_node",
			path: [0, 2],
			position: 4,
			properties: {},
		};

		const originalSplitPath = [...splitOp.path];

		const result = removeNode_splitNode(removeOp, splitOp);

		// The original operation should not be modified
		expect(splitOp.path).toEqual(originalSplitPath);
		// The result should be transformed
		expect(result.path).toEqual([0, 1]);
	});
});
