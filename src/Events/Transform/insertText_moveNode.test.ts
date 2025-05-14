import { insertText_moveNode } from "./insertText_moveNode";
import { InsertTextOperation, MoveNodeOperation } from "slate";

describe("insertText_moveNode transformation", () => {
	it("should not change path or newPath for simple insertText and moveNode", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "a",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
		});
	});

	it("should not shift when insert at sibling before move source", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 0,
			text: "x",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [3],
		});
	});

	it("should not shift when insert on ancestor of move source", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "yz",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		});
	});

	it("should not shift when insert on descendant of move source", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2, 0],
			offset: 1,
			text: "b",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [4],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [4],
		});
	});

	it("should not shift when insert on a completely different branch", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1],
			offset: 3,
			text: "cde",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 0],
			newPath: [3, 1],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 0],
			newPath: [3, 1],
		});
	});

	it("should not shift deep nested paths", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [2, 3, 1],
			offset: 4,
			text: "hello",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 3, 2],
			newPath: [4, 5, 6],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 3, 2],
			newPath: [4, 5, 6],
		});
	});

	it("should preserve additional custom properties", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 0,
			text: "!",
		};
		const original: MoveNodeOperation & any = {
			type: "move_node",
			path: [2],
			newPath: [3],
			customFlag: true,
			meta: { foo: "bar" },
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
			customFlag: true,
			meta: { foo: "bar" },
		});
	});

	it("should handle zero-length text insert without mutating paths", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [3],
			offset: 2,
			text: "",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [4],
			newPath: [5],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [4],
			newPath: [5],
		});
	});

	it("should return a new object instance (not the same reference)", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "z",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).not.toBe(original);
	});

	it("should not mutate the original operation object", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "q",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const copy = {
			...original,
			path: [...original.path],
			newPath: [...original.newPath],
		};
		insertText_moveNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should not shift source path when insertion is before newPath sibling", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 0,
			text: "w",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [1],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result.path).toEqual([2]);
		expect(result.newPath).toEqual([1]);
	});

	it("should not shift newPath for deeper sibling insertion", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1],
			offset: 2,
			text: "uv",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [0, 2],
			newPath: [0, 3, 1],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result.path).toEqual([0, 2]);
		expect(result.newPath).toEqual([0, 3, 1]);
	});

	it("should not shift when moving node to the same location", () => {
		const confirmed: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 1,
			text: "nop",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [1],
		};
		const result = insertText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [1],
		});
	});

	it("should remain stable when chaining multiple insertText operations", () => {
		const i1: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 1,
			text: "A",
		};
		const i2: InsertTextOperation = {
			type: "insert_text",
			path: [0],
			offset: 2,
			text: "B",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const r1 = insertText_moveNode(i1, original);
		const r2 = insertText_moveNode(i2, r1);
		expect(r2).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
		});
	});
});
