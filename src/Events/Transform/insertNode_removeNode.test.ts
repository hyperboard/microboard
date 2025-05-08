import { insertNode_removeNode } from "./insertNode_removeNode";
import { InsertNodeOperation, RemoveNodeOperation } from "slate";

describe("insertNode_removeNode transformation", () => {
	const dummyNode = { type: "dummy", children: [] };

	it("should shift remove_node path at root when insertion at same index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1],
		});
	});

	it("should shift remove_node path at root when insertion before transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [3],
		});
	});

	it("should not shift remove_node path at root when insertion after transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [3],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [2],
		});
	});

	it("should shift remove_node path at second level when sibling insertion before it", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1, 3],
		});
	});

	it("should shift remove_node path at second level when insertion index equals transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1, 3],
		});
	});

	it("should not shift remove_node path at second level when insertion index greater than transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 3],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1, 2],
		});
	});

	it("should shift remove_node when insertion is ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 5],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1, 5],
		});
	});

	it("should shift remove_node when insertion is deeper ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0, 2],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1, 1, 2],
		});
	});

	it("should not shift remove_node when insertion is descendant of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1, 0],
		});
	});

	it("should not shift remove_node when insertion is in a different branch", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1, 1],
		});
	});

	it("should shift remove_node path at third level when insertion at same sibling index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 0],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 1, 0],
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [2, 1, 1],
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
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const r1 = insertNode_removeNode(i1, original);
		const r2 = insertNode_removeNode(i2, r1);
		expect(r2).toEqual({
			type: "remove_node",
			path: [3],
		});
	});

	it("should preserve additional properties on RemoveNodeOperation", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: RemoveNodeOperation & any = {
			type: "remove_node",
			path: [0],
			extra: "foo",
		};
		const result = insertNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [1],
			extra: "foo",
		});
	});

	it("should handle batch operations correctly", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const ops: RemoveNodeOperation[] = [
			{ type: "remove_node", path: [0] },
			{ type: "remove_node", path: [1] },
			{ type: "remove_node", path: [0, 1] },
		];
		const results = ops.map(op => insertNode_removeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "remove_node", path: [1] },
			{ type: "remove_node", path: [2] },
			{ type: "remove_node", path: [1, 1] },
		]);
	});

	it("should not mutate the original RemoveNodeOperation object", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const original: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const result = insertNode_removeNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "remove_node",
			path: [1],
		});
	});
});
