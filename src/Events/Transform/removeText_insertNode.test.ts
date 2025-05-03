import { removeText_insertNode } from "./removeText_insertNode";
import { InsertNodeOperation, RemoveTextOperation } from "slate";

describe("removeText_insertNode", () => {
	test("should not modify path when operations target different branches", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1, 2],
			offset: 5,
			text: "hello",
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 0],
			node: { text: "world" },
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result.path).toEqual([1, 0, 0]);
	});

	test("should not modify path when removeText is at a descendant path", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1, 2],
			offset: 0,
			text: "text",
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: { text: "new node" },
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result.path).toEqual([0, 1]);
	});

	test("should not modify path when operations target same path", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1],
			offset: 3,
			text: "text",
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: { text: "inserted" },
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result.path).toEqual([0, 1]);
	});

	test("should preserve the node in the transformation", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "some text",
		};
		const nodeToInsert = { text: "preserved node" };
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: nodeToInsert,
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result.node).toBe(nodeToInsert);
	});

	test("should handle empty path arrays", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [],
			offset: 0,
			text: "text",
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [],
			node: { text: "root" },
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result.path).toEqual([]);
	});

	test("should handle path with many segments", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1, 2, 3, 4],
			offset: 2,
			text: "deep",
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1, 2, 3, 5],
			node: { text: "deep insert" },
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result.path).toEqual([0, 1, 2, 3, 5]);
	});

	test("should not modify type of operation", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0],
			offset: 0,
			text: "abc",
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { text: "node" },
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result.type).toBe("insert_node");
	});

	test("should handle complex node structures", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1],
			offset: 3,
			text: "removed",
		};
		const complexNode = {
			type: "paragraph",
			children: [{ text: "complex" }],
			data: { custom: true },
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: complexNode,
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result.node).toBe(complexNode);
		expect(result.path).toEqual([1, 0]);
	});

	test("should delegate path transformation to transformPath function", () => {
		// This test relies on the actual implementation of transformPath
		// Here we're testing the integration between the two functions
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "some text",
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: { text: "after removal" },
		};

		const result = removeText_insertNode(removeOp, insertOp);
		// The path should remain the same since removeText doesn't affect paths
		expect(result.path).toEqual([0, 1]);
	});

	test("should create a new operation object without modifying the original", () => {
		const removeOp: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "text",
		};
		const insertOp: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: { text: "new" },
		};

		const result = removeText_insertNode(removeOp, insertOp);
		expect(result).not.toBe(insertOp); // Check it's a new object
		expect(result).toEqual(insertOp); // But with the same content
	});
});
