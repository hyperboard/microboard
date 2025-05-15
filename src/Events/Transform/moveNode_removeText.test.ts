import { moveNode_removeText } from "./moveNode_removeText";
import { MoveNodeOperation, RemoveTextOperation } from "slate";

describe("moveNode_removeText transformation", () => {
	it("should not change path when moving in a different branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 2,
			text: "foo",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
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
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 0,
			text: "x",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
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
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 1,
			text: "bar",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
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
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 4,
			text: "baz",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
			path: [3, 2],
			offset: 4,
			text: "baz",
		});
	});

	it("should handle removal at the exact moved location", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 3,
			text: "q",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
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
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 3, 1],
			offset: 2,
			text: "z",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 2, 1],
			offset: 2,
			text: "z",
		});
	});

	it("should preserve offset and text content", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [4],
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [5],
			offset: 6,
			text: "unchanged",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
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
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [3],
			offset: 0,
			text: "dup",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).not.toBe(original);
		expect(result).toEqual({
			type: "remove_text",
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
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 2,
			text: "orig",
		};
		const copy = { ...original, path: [...original.path] };
		moveNode_removeText(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should preserve additional custom properties", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [0],
		};
		const original: RemoveTextOperation & any = {
			type: "remove_text",
			path: [2],
			offset: 1,
			text: "txt",
			custom: true,
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
			path: [2],
			offset: 1,
			text: "txt",
			custom: true,
		});
	});

	it("should chain multiple move_node operations", () => {
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
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [4],
			offset: 1,
			text: "chain",
		};
		const r1 = moveNode_removeText(m1, original);
		const r2 = moveNode_removeText(m2, r1);
		expect(r2).toEqual({
			type: "remove_text",
			path: [4],
			offset: 1,
			text: "chain",
		});
	});

	it("should handle batch operations: first unaffected", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [0],
			offset: 0,
			text: "",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
			path: [0],
			offset: 0,
			text: "",
		});
	});

	it("should handle batch operations: second maps to new location", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 1,
			text: "",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
			path: [2],
			offset: 1,
			text: "",
		});
	});

	it("should handle batch operations: third shifts down", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [3],
			offset: 2,
			text: "",
		};
		const result = moveNode_removeText(confirmed, original);
		expect(result).toEqual({
			type: "remove_text",
			path: [3],
			offset: 2,
			text: "",
		});
	});
});
