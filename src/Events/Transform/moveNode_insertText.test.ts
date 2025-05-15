import { moveNode_insertText } from "./moveNode_insertText";
import { MoveNodeOperation, InsertTextOperation } from "slate";

describe("moveNode_insertText transformation", () => {
	it("should not change path for move in a different branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "foo",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "foo",
		});
	});

	it("should shift path down when moving a sibling from before", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 0,
			text: "x",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 0,
			text: "x",
		});
	});

	it("should shift path up when moving a sibling to before", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [0],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 1,
			text: "bar",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [3],
			offset: 1,
			text: "bar",
		});
	});

	it("should remap path inside moved subtree to new location", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2],
			offset: 4,
			text: "baz",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [3, 2],
			offset: 4,
			text: "baz",
		});
	});

	it("should handle insert at the exact moved location", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "q",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [2],
			offset: 3,
			text: "q",
		});
	});

	it("should shift nested siblings at deeper level", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 2],
			newPath: [1, 0],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [0, 3, 1],
			offset: 2,
			text: "z",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 2, 1],
			offset: 2,
			text: "z",
		});
	});

	it("should not change offset or text content", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [4],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [5],
			offset: 6,
			text: "unchanged",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [5],
			offset: 6,
			text: "unchanged",
		});
	});

	it("should return a new object instance", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [3],
			offset: 0,
			text: "dup",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).not.toBe(original);
		expect(result).toEqual({
			type: "insert_text",
			path: [3],
			offset: 0,
			text: "dup",
		});
	});

	it("should not mutate the original operation object", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0],
			newPath: [1],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 2,
			text: "orig",
		};
		const copy = {
			type: "insert_text",
			path: [2],
			offset: 2,
			text: "orig",
		};
		moveNode_insertText(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should preserve additional custom properties", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [0],
		};
		const original: InsertTextOperation & any = {
			type: "insert_text",
			path: [2],
			offset: 1,
			text: "txt",
			custom: true,
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [2],
			offset: 1,
			text: "txt",
			custom: true,
		});
	});

	it("should handle chaining multiple move_node operations", () => {
		const m1: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const m2: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [0],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [4],
			offset: 1,
			text: "chain",
		};
		const r1 = moveNode_insertText(m1, original);
		const r2 = moveNode_insertText(m2, r1);
		expect(r2).toEqual({
			type: "insert_text",
			path: [4],
			offset: 1,
			text: "chain",
		});
	});

	it("should handle first of batch operations without altering it", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const op = {
			type: "insert_text",
			path: [0],
			offset: 0,
			text: "",
		} as InsertTextOperation;
		const result = moveNode_insertText(confirmed, op);
		expect(result).toEqual({
			type: "insert_text",
			path: [0],
			offset: 0,
			text: "",
		});
	});

	it("should handle second of batch operations mapping to new location", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const op = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "",
		} as InsertTextOperation;
		const result = moveNode_insertText(confirmed, op);
		expect(result).toEqual({
			type: "insert_text",
			path: [2],
			offset: 1,
			text: "",
		});
	});

	it("should handle third of batch operations correctly", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const op = {
			type: "insert_text",
			path: [3],
			offset: 2,
			text: "",
		} as InsertTextOperation;
		const result = moveNode_insertText(confirmed, op);
		expect(result).toEqual({
			type: "insert_text",
			path: [3],
			offset: 2,
			text: "",
		});
	});

	it("should remap descendant of moved node deeper mapping", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [0],
		};
		const original: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0, 2],
			offset: 5,
			text: "deep",
		};
		const result = moveNode_insertText(confirmed, original);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 0, 2],
			offset: 5,
			text: "deep",
		});
	});
});
