import { splitNode_insertText } from "./splitNode_insertText";
import { SplitNodeOperation, InsertTextOperation } from "slate";

describe("splitNode_insertText transformation", () => {
	it("should decrement offset when same path and confirmed.position < offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "abc",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "abc",
		});
	});

	it("should zero offset when same path and confirmed.position == offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 0],
			position: 4,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0, 0],
			offset: 4,
			text: "xyz",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 0],
			offset: 0,
			text: "xyz",
		});
	});

	it("should not change offset when same path and confirmed.position > offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 5,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 3,
			text: "test",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2],
			offset: 3,
			text: "test",
		});
	});

	it("should shift sibling path indices after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 1,
			text: "A",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [3],
			offset: 1,
			text: "A",
		});
	});

	it("should not shift sibling indices before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "B",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "B",
		});
	});

	it("should shift nested descendant paths after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2],
			offset: 2,
			text: "C",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 2],
			offset: 2,
			text: "C",
		});
	});

	it("should not shift paths for non-descendant branches", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0, 5],
			offset: 2,
			text: "D",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 5],
			offset: 2,
			text: "D",
		});
	});

	it("should handle multiple siblings in batch", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const ops: InsertTextOperation[] = [
			{ type: "insert_text", path: [1], offset: 0, text: "X" },
			{ type: "insert_text", path: [2], offset: 1, text: "Y" },
		];

		const results = ops.map(op => splitNode_insertText(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_text", path: [2], offset: 0, text: "X" },
			{ type: "insert_text", path: [3], offset: 1, text: "Y" },
		]);
	});

	it("should not mutate the original toTransform operation", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 2,
			text: "orig",
		};
		const original = { ...toTransform };

		splitNode_insertText(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});

	it("should combine offset adjust and path shift", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 5,
			text: "Z",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		// offset unchanged for different path, but path shifts from 2->3
		expect(result).toEqual({
			type: "insert_text",
			path: [3],
			offset: 5,
			text: "Z",
		});
	});

	// Additional edge cases:
	it("should not change offset or path when confirmed.position is zero on same path", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "edge",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "edge",
		});
	});

	it("should shift direct nested descendant path but not offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 2,
			text: "nest",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 0],
			offset: 2,
			text: "nest",
		});
	});

	it("should adjust offset for nested same-path but not shift path", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 3,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 5,
			text: "deep",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 0],
			offset: 2,
			text: "deep",
		});
	});

	it("should apply multiple sequential splits correctly", () => {
		const splitA: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const splitB: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 1,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "multi",
		};

		const r1 = splitNode_insertText(splitA, toTransform);
		const result = splitNode_insertText(splitB, r1);
		// After first: offset=3, path stays [1]. After second, path shifts: 1->2
		expect(result).toEqual({
			type: "insert_text",
			path: [2],
			offset: 3,
			text: "multi",
		});
	});

	it("should leave nested same-path unchanged when confirmed.position > offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1],
			position: 5,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 3,
			text: "unch",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 1],
			offset: 3,
			text: "unch",
		});
	});
});
