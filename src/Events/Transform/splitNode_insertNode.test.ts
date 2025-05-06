import { splitNode_insertNode } from "./splitNode_insertNode";
import { SplitNodeOperation, InsertNodeOperation } from "slate";

describe("splitNode_insertNode transformation", () => {
	it("should shift root-level sibling nodes after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { id: 1 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [3],
			node: { id: 1 },
		});
	});

	it("should not shift before split for root-level nodes", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { id: 2 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { id: 2 },
		});
	});

	it("should shift nested first index for non-ancestor branch", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { id: 3 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 2],
			node: { id: 3 },
		});
	});

	it("should not shift nested nodes before split on different branch", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: { id: 4 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [0, 1],
			node: { id: 4 },
		});
	});

	it("should shift nested sibling indices after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { id: 5 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1, 3],
			node: { id: 5 },
		});
	});

	it("should not shift same node path", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { id: 6 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2],
			node: { id: 6 },
		});
	});

	it("should chain multiple splits correctly", () => {
		const splitA: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const splitB: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1],
			node: { id: 7 },
		};

		const r1 = splitNode_insertNode(splitA, toTransform);
		const result = splitNode_insertNode(splitB, r1);
		expect(result).toEqual({
			type: "insert_node",
			path: [4, 1],
			node: { id: 7 },
		});
	});

	it("should preserve additional properties on InsertNodeOperation", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { id: 8 },
			others: true,
		} as any;

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [3],
			node: { id: 8 },
			others: true,
		});
	});

	it("should handle deep descendant shift", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: { id: 9 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 0, 2],
			node: { id: 9 },
		});
	});

	it("should support batch insertNode transformations", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const ops: InsertNodeOperation[] = [
			{ type: "insert_node", path: [3], node: { id: 10 } },
			{ type: "insert_node", path: [4], node: { id: 11 } },
		];

		const results = ops.map(op => splitNode_insertNode(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_node", path: [4], node: { id: 10 } },
			{ type: "insert_node", path: [5], node: { id: 11 } },
		]);
	});

	it("should shift direct child of split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: { id: 12 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 0],
			node: { id: 12 },
		});
	});

	it("should not shift parent when splitting its descendant", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { id: 13 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [1],
			node: { id: 13 },
		});
	});

	it("should not shift complex non-ancestor descendant", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2, 1],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0, 5],
			node: { id: 14 },
		};

		const result = splitNode_insertNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 0, 5],
			node: { id: 14 },
		});
	});

	it("should chain multiple splits with nested descendant shift", () => {
		const splitA: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const splitB: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: { id: 15 },
		};

		const r1 = splitNode_insertNode(splitA, toTransform);
		const result = splitNode_insertNode(splitB, r1);
		expect(result).toEqual({
			type: "insert_node",
			path: [2, 0, 2],
			node: { id: 15 },
		});
	});

	it("should support batch nested descendant transformations", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const ops: InsertNodeOperation[] = [
			{ type: "insert_node", path: [1, 1, 0], node: { id: 16 } },
			{ type: "insert_node", path: [1, 2, 1], node: { id: 17 } },
		];

		const results = ops.map(op => splitNode_insertNode(confirmed, op));
		expect(results).toEqual([
			{ type: "insert_node", path: [2, 1, 0], node: { id: 16 } },
			{ type: "insert_node", path: [2, 2, 1], node: { id: 17 } },
		]);
	});
});
