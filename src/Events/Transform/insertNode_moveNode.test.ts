import { insertNode_moveNode } from "./insertNode_moveNode";
import { InsertNodeOperation, MoveNodeOperation } from "slate";

describe("insertNode_moveNode transformation", () => {
	it("should not shift when insert in a different branch (deeper insert)", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
		});
	});

	it("should shift both path and newPath at root when insert before", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
		});
	});

	it("should shift when inserting at the same index (equal sibling)", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [1],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [2],
		});
	});

	it("should handle ancestor insertion for source path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 2],
			newPath: [4, 4],
		});
	});

	it("should handle ancestor insertion for destination path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3],
			newPath: [1, 2],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [4],
			newPath: [2, 2],
		});
	});

	it("should shift nested siblings at depth 2", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 3, 0],
			newPath: [1, 3, 1],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 4, 0],
			newPath: [1, 4, 1],
		});
	});

	it("should shift nested siblings when index equals", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 3],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 3, 2],
			newPath: [1, 3, 4],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 4, 2],
			newPath: [1, 4, 4],
		});
	});

	it("should not shift source path when insert is a descendant", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2, 0],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [1, 2],
			newPath: [3, 4],
		});
	});

	it("should handle deep ancestor insertion on destination", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [3, 4],
			newPath: [2, 1, 3],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3, 4], // вставка на [2,1] не влияет на узлы вне этого родителя
			newPath: [2, 2, 3], // глубокая вставка сдвигает сегмент на той же глубине
		});
	});

	it("should shift when inserting sibling in deep descendant", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 0],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2, 1, 1],
			newPath: [2, 1, 2],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2, 1, 2],
			newPath: [2, 1, 3],
		});
	});

	it("should preserve custom properties", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { text: "" },
		};
		const original: MoveNodeOperation & any = {
			type: "move_node",
			path: [2],
			newPath: [3],
			custom: true,
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [3],
			newPath: [4],
			custom: true,
		});
	});

	it("should shift even for zero-length insert", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { text: "", marks: [] },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).toEqual({
			type: "move_node",
			path: [2],
			newPath: [3],
		});
	});

	it("should return a new instance, not mutate original", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [1],
			newPath: [2],
		};
		const result = insertNode_moveNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "move_node",
			path: [1],
			newPath: [2],
		});
	});

	it("should remain stable when chaining multiple insertNode operations", () => {
		const i1: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { text: "" },
		};
		const i2: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { text: "" },
		};
		const original: MoveNodeOperation = {
			type: "move_node",
			path: [2],
			newPath: [3],
		};
		const r1 = insertNode_moveNode(i1, original);
		const r2 = insertNode_moveNode(i2, r1);
		expect(r2).toEqual({
			type: "move_node",
			path: [4], // 2→3→4
			newPath: [5], // 3→4→5
		});
	});
});
