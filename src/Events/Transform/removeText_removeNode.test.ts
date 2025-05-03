import { RemoveTextOperation, RemoveNodeOperation } from "slate";
import { removeText_removeNode } from "./removeText_removeNode";

describe("removeText_removeNode transformation", () => {
	it("should not modify RemoveNodeOperation when paths are different", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "test",
		};

		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
			node: { text: "some content" },
		};

		const result = removeText_removeNode(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should not modify RemoveNodeOperation when paths are the same", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "test",
		};

		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
			node: { text: "some content" },
		};

		const result = removeText_removeNode(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should handle nested paths without modification", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0, 1],
			offset: 2,
			text: "abc",
		};

		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
			node: { text: "some content" },
		};

		const result = removeText_removeNode(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should handle deep nested paths without modification", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1, 2, 3],
			offset: 5,
			text: "xyz",
		};

		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
			node: { text: "another content" },
		};

		const result = removeText_removeNode(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should handle operations with empty text removal", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 2,
			text: "",
		};

		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
			node: { text: "some content" },
		};

		const result = removeText_removeNode(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should maintain original node information", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1],
			offset: 0,
			text: "remove",
		};

		const originalNode = {
			type: "paragraph",
			children: [{ text: "some content" }],
		};

		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
			node: originalNode,
		};

		const result = removeText_removeNode(confirmed, toTransform);

		expect(result.node).toEqual(originalNode);
	});
});
