import { removeText_moveNode } from "./removeText_moveNode";
import { RemoveTextOperation, MoveNodeOperation } from "slate";

describe("removeText_moveNode transformation", () => {
	it("should not change paths for a simple remove_text operation", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 2,
			text: "abc",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
		});
	});

	it("should not shift when removal at sibling before move source path", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0],
			offset: 0,
			text: "x",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
		});
	});

	it("should not shift when removal at sibling after move source path", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [3],
			offset: 1,
			text: "yz",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [4],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [4],
		});
	});

	it("should not shift when removal at ancestor of move source path", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 5,
			text: "hello",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		});
	});

	it("should not shift when removal at descendant of move source path", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [2, 1],
			offset: 2,
			text: "cd",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [5],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [5],
		});
	});

	it("should not shift when removal on a completely different branch", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1],
			offset: 3,
			text: "xyz",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 0],
			newPath: [3, 1],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 0],
			newPath: [3, 1],
		});
	});

	it("should not shift deep nested paths", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [2, 3, 1, 0],
			offset: 4,
			text: "deep",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 3, 2, 1],
			newPath: [4, 5, 6, 7],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 3, 2, 1],
			newPath: [4, 5, 6, 7],
		});
	});

	it("should preserve additional custom properties", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
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
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
			customFlag: true,
			meta: { foo: "bar" },
		});
	});

	it("should handle zero-length removal without mutating paths", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [3],
			offset: 2,
			text: "",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [4],
			newPath: [5],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [4],
			newPath: [5],
		});
	});

	it("should return a new object instance (not the same reference)", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0],
			offset: 1,
			text: "z",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).not.toBe(original);
	});

	it("should not mutate the original operation object", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
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
		removeText_moveNode(confirmed, original);
		expect(original).toEqual(copy);
	});

	it("should remain identity when chaining multiple removeText operations", () => {
		const r1: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 1,
			text: "A",
		};
		const r2: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 2,
			text: "B",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [4],
		};
		const first = removeText_moveNode(r1, original);
		const second = removeText_moveNode(r2, first);
		expect(second).toEqual({
			type: "move_node",
			path: [3],
			newPath: [4],
		});
	});

	it("should handle batch operations without altering any move operations", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0],
			offset: 1,
			text: "Z",
		};
		const ops: MoveNodeOperation[] = [
			{ type: "move_node", path: [1], newPath: [2] },
			{ type: "move_node", path: [0], newPath: [3] },
			{ type: "move_node", path: [0, 1], newPath: [1, 2] },
		];
		const results = ops.map(op => removeText_moveNode(confirmed, op));
		expect(results).toEqual([
			{ type: "move_node", path: [1], newPath: [2] },
			{ type: "move_node", path: [0], newPath: [3] },
			{ type: "move_node", path: [0, 1], newPath: [1, 2] },
		]);
	});

	it("should not shift when confirmed removal path equals move source path", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 1,
			text: "a",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [4],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [4],
		});
	});

	it("should not shift when confirmed removal path equals move destination path", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [3, 1],
			offset: 2,
			text: "hi",
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3, 1],
		};
		const result = removeText_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1],
			newPath: [3, 1],
		});
	});
});
