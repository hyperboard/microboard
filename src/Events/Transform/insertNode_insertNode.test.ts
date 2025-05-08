import { insertNode_insertNode } from "./insertNode_insertNode";
import { InsertNodeOperation } from "slate";

describe("insertNode_insertNode transformation", () => {
	const dummyNode: any = { type: "dummy", children: [] };

	it("should shift insert_node path at root when insertion at same index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: dummyNode,
		});
	});

	it("should shift path at root when insertion before transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [3],
			node: dummyNode,
		});
	});

	it("should not shift path at root when insertion after transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [3],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2],
			node: dummyNode,
		});
	});

	it("should shift path at second level when sibling insertion before it", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 3],
			node: dummyNode,
		});
	});

	it("should shift path at second level when insertion index equals transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 3],
			node: dummyNode,
		});
	});

	it("should not shift path at second level when insertion index greater than transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 3],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		});
	});

	it("should shift when insertion is ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 5],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 5],
			node: dummyNode,
		});
	});

	it("should shift when insertion is deeper ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 1, 2],
			node: dummyNode,
		});
	});

	it("should not shift when insertion is descendant of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		});
	});

	it("should not shift when insertion is in a different branch", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 1],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 1],
			node: dummyNode,
		});
	});

	it("should shift at deep sibling when insertion at same path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 0],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 0],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 1, 1],
			node: dummyNode,
		});
	});

	it("should shift at sibling branch when insertion at [2,1] before [2,2,3]", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1],
			node: dummyNode,
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 2, 3],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 3, 3],
			node: dummyNode,
		});
	});

	it("should handle multiple sequential insertions", () => {
		const i1: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const i2: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const r1 = insertNode_insertNode(i1, original);
		const r2 = insertNode_insertNode(i2, r1);
		expect(r2).toEqual({ type: "insert_node", path: [3], node: dummyNode });
	});

	it("should handle batch operations correctly", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const ops: InsertNodeOperation[] = [
			{ type: "insert_node", path: [0], node: dummyNode },
			{ type: "insert_node", path: [1], node: dummyNode },
			{ type: "insert_node", path: [2, 0], node: dummyNode },
		];
		const results = ops.map(op => insertNode_insertNode(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_node", path: [1], node: dummyNode },
			{ type: "insert_node", path: [2], node: dummyNode },
			{ type: "insert_node", path: [3, 0], node: dummyNode },
		]);
	});

	it("should not mutate the original InsertNodeOperation object", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const original: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const result = insertNode_insertNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "insert_node",
			path: [1],
			node: dummyNode,
		});
	});
});
