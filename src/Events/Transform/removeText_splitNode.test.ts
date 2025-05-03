import { RemoveTextOperation, SplitNodeOperation } from "slate";
import { removeText_splitNode } from "./removeText_splitNode";

describe("removeText_splitNode transformation", () => {
	it("should adjust split position when text is removed before split point", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "hello",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 10,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 5,
			properties: {},
		});
	});

	it("should not adjust split position when text is removed after split point", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 10,
			text: "hello",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 5,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should not adjust split position when operations are on different paths", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "hello",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 5,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should adjust split position when text is removed exactly at split point", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 5,
			text: "hello",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 5,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		});
	});

	it("should handle split point adjustment with unicode characters", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "😀😀",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 6,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 2,
			properties: {},
		});
	});

	it("should preserve original split position when removed text length is zero", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 5,
			text: "",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 10,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should transform path when operation paths are affected", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "remove",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0, 0],
			position: 5,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0, 0],
			position: 5,
			properties: {},
		});
	});

	it("should handle large text removal near split point", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "a".repeat(1000),
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 1500,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 500,
			properties: {},
		});
	});

	it("should handle split point exactly matching removed text length", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "hello world",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 11,
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		});
	});
	it("should return a no-op split node operation when split node position is completely removed", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 5,
			text: "entire", // Removes the entire split point position
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 7, // Position is within the removed text range
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 0, // No-op position
			properties: {},
		});
	});

	it("should return a no-op split node operation when split node position is at the start of removed text", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 5,
			text: "something",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 5, // Exactly where removal starts
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 0, // No-op position
			properties: {},
		});
	});

	it("should return a no-op split node operation when split node position is at the end of removed text", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 5,
			text: "something",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 14, // Exactly where removal ends
			properties: {},
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 0, // No-op position
			properties: {},
		});
	});

	it("should return a no-op split node operation for complex removal scenarios", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 3,
			text: "large text segment that completely invalidates split position",
		};

		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 20, // Within removed text range
			properties: { someProperty: true },
		};

		const result = removeText_splitNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 0, // No-op position
			properties: { someProperty: true }, // Preserve original properties
		});
	});
});
