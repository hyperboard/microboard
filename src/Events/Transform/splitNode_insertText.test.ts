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
			// since offset >= position, we now route into the new node at [2]
			path: [2],
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
			// offset 4-4 = 0, and we route into the new node at [0,1]
			path: [0, 1],
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
		expect(result).toEqual({
			type: "insert_text",
			path: [3],
			offset: 5,
			text: "Z",
		});
	});

	it("should route insert into the new node when offset >= split position", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 10,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 12,
			text: "X",
		};

		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "X",
		});
	});
});

describe("splitNode_insertText transformation – additional edge cases", () => {
	it("should shift multi-level sibling paths after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 3],
			offset: 4,
			text: "foo",
		};
		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [3, 3],
			offset: 4,
			text: "foo",
		});
	});

	it("should shift only second-level siblings under a deeper split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 1,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0, 2, 5],
			offset: 1,
			text: "bar",
		};
		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 3, 5],
			offset: 1,
			text: "bar",
		});
	});

	it("should not shift when split is on ancestor deeper than the toTransform path", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0, 2],
			position: 2,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0],
			offset: 3,
			text: "baz",
		};
		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 0],
			offset: 3,
			text: "baz",
		});
	});

	it("should decrement offset and route path when same deep path", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1],
			position: 3,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 6,
			text: "deep",
		};
		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 2], // path bumped at last segment
			offset: 3,
			text: "deep",
		});
	});

	it("should treat confirmed.position at offset 0 as bumping path but no-op offset", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 4,
			text: "noop",
		};
		const result = splitNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [3], // path bumped
			offset: 4,
			text: "noop",
		});
	});
});
