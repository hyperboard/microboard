import { insertNode_splitNode } from "./insertNode_splitNode";
import { InsertNodeOperation, SplitNodeOperation } from "slate";

describe("insertNode_splitNode transformation", () => {
	const dummyNode = { type: "dummy", children: [] };

	it("should shift split path at root when insertion at same index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 1,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		});
	});

	it("should shift split path at root when insertion before transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 3,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [3],
			position: 3,
			properties: {},
		});
	});

	it("should not shift split path when insertion after transform path at root", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [3],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		});
	});

	it("should shift split path at second level when sibling insertion before it", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 5,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 3],
			position: 5,
			properties: {},
		});
	});

	it("should not shift second-level split when insertion index greater", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 2,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 1],
			position: 2,
			properties: {},
		});
	});

	it("should shift split at root when insertion in a different branch before it", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [3, 0],
			position: 1,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [3, 0],
			position: 1,
			properties: {},
		});
	});

	it("should shift at deeper level when insertion splits that level", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 0],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1, 2],
			position: 0,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 1, 3],
			position: 0,
			properties: {},
		});
	});

	it("should not shift at deeper level when insertion index greater", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 2],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1, 1],
			position: 4,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 1, 1],
			position: 4,
			properties: {},
		});
	});

	it("should shift when insertion is ancestor of split path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 5],
			position: 3,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 5],
			position: 3,
			properties: {},
		});
	});

	it("should shift when split is ancestor of insertion path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		});
	});

	it("should preserve additional properties on SplitNodeOperation", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const toTransform: SplitNodeOperation & any = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
			customFlag: true,
		};
		const result = insertNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [3],
			position: 0,
			properties: {},
			customFlag: true,
		});
	});

	it("should handle multiple sequential inserts", () => {
		const i1: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const i2: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const r1 = insertNode_splitNode(i1, original);
		const r2 = insertNode_splitNode(i2, r1);
		expect(r2).toEqual({
			type: "split_node",
			path: [3],
			position: 1,
			properties: {},
		});
	});

	it("should handle batch operations correctly", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const ops: SplitNodeOperation[] = [
			{ type: "split_node", path: [0], position: 0, properties: {} },
			{ type: "split_node", path: [1], position: 2, properties: {} },
			{ type: "split_node", path: [2, 0], position: 1, properties: {} },
		];
		const results = ops.map(op => insertNode_splitNode(confirmed, op));
		expect(results).toEqual([
			{ type: "split_node", path: [0], position: 0, properties: {} },
			{ type: "split_node", path: [2], position: 2, properties: {} },
			{ type: "split_node", path: [3, 0], position: 1, properties: {} },
		]);
	});

	it("should not mutate the original SplitNodeOperation object", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		};
		const result = insertNode_splitNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		});
	});
});
