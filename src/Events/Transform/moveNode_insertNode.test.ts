import { moveNode_insertNode } from "./moveNode_insertNode";
import { MoveNodeOperation, InsertNodeOperation } from "slate";

describe("moveNode_insertNode transformation", () => {
	it("should not change path when moving in a different branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { text: "foo" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { text: "foo" },
		});
	});

	it("should shift path down when moving a sibling from before", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { text: "x" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { text: "x" },
		});
	});

	it("should shift path up when moving a sibling to before", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [0],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { text: "bar" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [3],
			node: { text: "bar" },
		});
	});

	it("should remap path inside moved subtree to new location", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [3],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { text: "baz" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [3, 2],
			node: { text: "baz" },
		});
	});

	it("should handle insert at the exact moved location", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { text: "q" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [2],
			node: { text: "q" },
		});
	});

	it("should shift nested siblings at deeper level", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 2],
			newPath: [1, 0],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 3, 1],
			node: { text: "z" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 2, 1],
			node: { text: "z" },
		});
	});

	it("should remap deep descendant of moved branch", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 0],
			newPath: [2, 1],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: { text: "deep" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 1, 2],
			node: { text: "deep" },
		});
	});

	it("should not change ancestor paths above the moved node", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { text: "anc" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { text: "anc" },
		});
	});

	it("should not change branch outside the move parent", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [0, 1],
			newPath: [2, 3],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [3, 0],
			node: { text: "out" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [3, 0],
			node: { text: "out" },
		});
	});

	it("should preserve node content exactly", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [4],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [5],
			node: { text: "keep" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [5],
			node: { text: "keep" },
		});
	});

	it("should preserve custom properties", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [0],
		};
		const original: InsertNodeOperation & any = {
			type: "insert_node",
			path: [2],
			node: { text: "txt" },
			custom: true,
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).toEqual({
			type: "insert_node",
			path: [2],
			node: { text: "txt" },
			custom: true,
		});
	});

	it("should return a new object instance", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [3],
			node: { text: "dup" },
		};
		const result = moveNode_insertNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(result).toEqual({
			type: "insert_node",
			path: [3],
			node: { text: "dup" },
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
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [4],
			node: { text: "chain" },
		};
		const r1 = moveNode_insertNode(m1, original);
		const r2 = moveNode_insertNode(m2, r1);
		expect(r2).toEqual({
			type: "insert_node",
			path: [4],
			node: { text: "chain" },
		});
	});

	it("should handle batch operations without altering unaffected inserts", () => {
		const confirmed: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const ops: InsertNodeOperation[] = [
			{ type: "insert_node", path: [0], node: { text: "a" } },
			{ type: "insert_node", path: [1], node: { text: "b" } },
			{ type: "insert_node", path: [3], node: { text: "c" } },
		];
		const results = ops.map(op => moveNode_insertNode(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_node", path: [0], node: { text: "a" } },
			{ type: "insert_node", path: [2], node: { text: "b" } },
			{ type: "insert_node", path: [3], node: { text: "c" } },
		]);
	});
});
