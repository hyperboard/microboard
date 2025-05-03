import { RemoveTextOperation, MergeNodeOperation } from "slate";
import { removeText_mergeNode } from "./removeText_mergeNode";

describe("removeText_mergeNode", () => {
	it("should adjust position when removing text from a sibling path before merge position", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 3,
			text: "abc",
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 2,
			target: null,
		});
	});

	it("should not adjust position when removing text after merge position", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1],
			offset: 6,
			text: "def",
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		});
	});

	it("should not adjust position when removing text on a different path", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 3,
			text: "abc",
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		});
	});

	it("should handle removing text exactly at the merge position", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 5,
			text: "hello",
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 0,
			target: null,
		});
	});

	it("should handle complex path transformations", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 3,
			text: "abc",
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result.path).toEqual([0, 2]);

		expect(result.position).toBe(5);
	});

	it("should handle removing text partially overlapping with merge position", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 3,
			text: "abcd", // Removing 4 characters, with position 5 in the middle
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 1, // 5 - 4 = 1
			target: null,
		});
	});

	it("should not adjust position when removing text from a node after the merge path", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 2], // Node after the merge node
			offset: 0,
			text: "xyz",
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 5, // Position unchanged
			target: null,
		});
	});

	it("should handle deeply nested paths correctly", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2, 3, 0],
			offset: 3,
			text: "abc",
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2, 3, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [1, 2, 3, 1],
			position: 2, // 5 - 3 = 2
			target: null,
		});
	});

	it("should handle removing text that would make position negative", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "abcdefghij", // 10 characters, more than the position
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 0, // Should floor at 0, not go negative
			target: null,
		});
	});

	it("should not adjust position when paths share only part of the ancestry", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1, 0], // A child of the merge node
			offset: 3,
			text: "abc",
		};

		const toTransform: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 1],
			position: 5,
			target: null,
		};

		const result = removeText_mergeNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "merge_node",
			path: [0, 1],
			position: 5, // Position unchanged
			target: null,
		});
	});
});
