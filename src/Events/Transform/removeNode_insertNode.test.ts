import { removeNode_insertNode } from "./removeNode_insertNode";
import { RemoveNodeOperation, InsertNodeOperation } from "slate";

describe("removeNode_insertNode transformation", () => {
	it("should shift root-level sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { dummy: true },
		});
	});

	it("should not shift root-level sibling before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { dummy: true },
		});
	});

	it("should shift nested sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 1],
			node: { dummy: true },
		});
	});

	it("should not shift nested sibling before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 1],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 1],
			node: { dummy: true },
		});
	});

	it("should shift deep nested sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 2],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 3, 0],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 2, 0],
			node: { dummy: true },
		});
	});

	it("should not affect shorter paths than removal depth", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 1],
			node: { dummy: true },
		});
	});

	it("should leave descendant of removed node unchanged", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 0, 2],
			node: { dummy: true },
		});
	});

	it("should shift sibling on different branch at root level", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 1],
			node: { dummy: true },
		});
	});

	it("should not shift when removal deeper in path not affecting this path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 0],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 0],
			node: { dummy: true },
		});
	});

	it("should shift nested sibling at parent level", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 3],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 5, 1],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 4, 1],
			node: { dummy: true },
		});
	});

	it("should preserve node property and extra props", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertNodeOperation & any = {
			type: "insert_node",
			path: [2],
			node: { dummy: true },
			meta: "info",
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { dummy: true },
			meta: "info",
		});
	});

	it("should handle chained removals correctly", () => {
		const r1: RemoveNodeOperation = { type: "remove_node", path: [1] };
		const r2: RemoveNodeOperation = { type: "remove_node", path: [0] };
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1],
			node: { dummy: true },
		};
		const i1 = removeNode_insertNode(r1, toTransform);
		const result = removeNode_insertNode(r2, i1);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 1],
			node: { dummy: true },
		});
	});

	it("should handle batch operations", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const ops: InsertNodeOperation[] = [
			{ type: "insert_node", path: [1], node: { a: 1 } },
			{ type: "insert_node", path: [2], node: { b: 2 } },
		];
		const results = ops.map(op => removeNode_insertNode(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_node", path: [0], node: { a: 1 } },
			{ type: "insert_node", path: [1], node: { b: 2 } },
		]);
	});

	it("should not drop insert_node when removal path equals toTransform.path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { dummy: true },
		};
		const result = removeNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { dummy: true },
		});
	});
});
