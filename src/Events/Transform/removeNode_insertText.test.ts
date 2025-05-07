import { removeNode_insertText } from "./removeNode_insertText";
import { RemoveNodeOperation, InsertTextOperation } from "slate";

describe("removeNode_insertText transformation", () => {
	it("should shift root-level sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 5,
			text: "abc",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "abc",
		});
	});

	it("should not shift root-level sibling before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "xyz",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 3,
			text: "xyz",
		});
	});

	it("should shift nested sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2],
			offset: 0,
			text: "hello",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 1],
			offset: 0,
			text: "hello",
		});
	});

	it("should not shift nested sibling before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 1],
			offset: 2,
			text: "test",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 1],
			offset: 2,
			text: "test",
		});
	});

	it("should shift deep nested sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 2],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0, 3, 0],
			offset: 1,
			text: "!",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 2, 0],
			offset: 1,
			text: "!",
		});
	});

	it("should not affect shorter paths than removal depth", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1],
			offset: 7,
			text: "data",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 1],
			offset: 7,
			text: "data",
		});
	});

	it("should leave descendant of removed node unchanged", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1, 0, 2],
			offset: 4,
			text: "desc",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 0, 2],
			offset: 4,
			text: "desc",
		});
	});

	it("should shift sibling on different branch at root level", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 6,
			text: "branch",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1, 1],
			offset: 6,
			text: "branch",
		});
	});

	it("should preserve offset and text properties", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [3],
			offset: 9,
			text: "preserve",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2],
			offset: 9,
			text: "preserve",
		});
	});

	it("should handle chained removals correctly", () => {
		const r1: RemoveNodeOperation = { type: "remove_node", path: [1] };
		const r2: RemoveNodeOperation = { type: "remove_node", path: [0] };
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 1],
			offset: 3,
			text: "chain",
		};
		const i1 = removeNode_insertText(r1, toTransform);
		const result = removeNode_insertText(r2, i1);
		expect(result).toEqual({
			type: "insert_text",
			path: [0, 1],
			offset: 3,
			text: "chain",
		});
	});

	it("should handle batch operations", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const ops: InsertTextOperation[] = [
			{ type: "insert_text", path: [1], offset: 1, text: "a" },
			{ type: "insert_text", path: [2], offset: 2, text: "b" },
		];
		const results = ops.map(op => removeNode_insertText(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_text", path: [0], offset: 1, text: "a" },
			{ type: "insert_text", path: [1], offset: 2, text: "b" },
		]);
	});

	it("should not shift when removal deeper in path not affecting this path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 0],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 0],
			offset: 5,
			text: "deep",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 0],
			offset: 5,
			text: "deep",
		});
	});

	it("should shift nested sibling at parent level", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 3],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2, 5, 1],
			offset: 0,
			text: "parent",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [2, 4, 1],
			offset: 0,
			text: "parent",
		});
	});

	it("should not drop insert_text when removal path equals toTransform.path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "equal",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 2,
			text: "equal",
		});
	});

	it("should handle zero-length text insertion", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [2],
			offset: 0,
			text: "",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 0,
			text: "",
		});
	});

	it("should preserve additional properties on InsertTextOperation", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertTextOperation & any = {
			type: "insert_text",
			path: [2],
			offset: 4,
			text: "meta",
			bold: true,
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 4,
			text: "meta",
			bold: true,
		});
	});

	it("should shift nested siblings in multi-depth batch operations", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const ops: InsertTextOperation[] = [
			{ type: "insert_text", path: [1, 3], offset: 1, text: "a" },
			{ type: "insert_text", path: [1, 1], offset: 2, text: "b" },
			{ type: "insert_text", path: [2, 0], offset: 3, text: "c" },
		];
		const results = ops.map(op => removeNode_insertText(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_text", path: [1, 2], offset: 1, text: "a" },
			{ type: "insert_text", path: [1, 1], offset: 2, text: "b" },
			{ type: "insert_text", path: [2, 0], offset: 3, text: "c" },
		]);
	});

	it("should not shift when removal prefix is deeper than toTransform.path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const toTransform: InsertTextOperation = {
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "prefix",
		};
		const result = removeNode_insertText(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_text",
			path: [1],
			offset: 5,
			text: "prefix",
		});
	});
});
