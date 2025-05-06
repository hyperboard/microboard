import { splitNode_removeText } from "./splitNode_removeText";
import { SplitNodeOperation, RemoveTextOperation } from "slate";

describe("splitNode_removeText transformation", () => {
	it("should decrease offset when same path and confirmed.position < offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 5,
			text: "hello",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 3,
			text: "hello",
		});
	});

	it("should zero offset when same path and confirmed.position equals offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 0],
			position: 4,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 4,
			text: "test",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "test",
		});
	});

	it("should not change offset when same path and confirmed.position > offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 5,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 3,
			text: "abc",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2],
			offset: 3,
			text: "abc",
		});
	});

	it("should shift root-level sibling paths after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 0,
			text: "x",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [3],
			offset: 0,
			text: "x",
		});
	});

	it("should not shift root-level nodes before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 1,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 0,
			text: "y",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 0,
			text: "y",
		});
	});

	it("should shift first segment for non-descendant deep paths", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 1,
			text: "z",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2, 2],
			offset: 1,
			text: "z",
		});
	});

	it("should shift descendant paths for split on ancestor", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 3],
			offset: 2,
			text: "t",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2, 3],
			offset: 2,
			text: "t",
		});
	});

	it("should shift nested sibling index", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 0,
			text: "u",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 3],
			offset: 0,
			text: "u",
		});
	});

	it("should not modify non-descendant deep paths when before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2, 2],
			position: 1,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 1],
			offset: 1,
			text: "v",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 1],
			offset: 1,
			text: "v",
		});
	});
	it("should not mutate the original toTransform operation", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 2,
			text: "orig",
		};
		const original = { ...toTransform };

		splitNode_removeText(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});

	it("should not change offset when confirmed.position is zero", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 7,
			text: "abc",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2],
			offset: 7,
			text: "abc",
		});
	});

	it("should adjust offset for nested same path deeper levels", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2, 3],
			position: 3,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2, 3],
			offset: 5,
			text: "hello",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 2, 3],
			offset: 2,
			text: "hello",
		});
	});

	it("should shift path for root-level descendant without changing offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 3],
			offset: 4,
			text: "X",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2, 3],
			offset: 4,
			text: "X",
		});
	});

	it("should not shift path for non-root ancestor (deeper descendant)", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 2,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 1, 5],
			offset: 6,
			text: "Y",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 1, 5],
			offset: 6,
			text: "Y",
		});
	});

	it("should shift nested sibling indices after deeper split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 3],
			offset: 2,
			text: "Z",
		};

		const result = splitNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 4],
			offset: 2,
			text: "Z",
		});
	});
});
