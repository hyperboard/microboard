import { setNode_insertNode } from "./setNode_insertNode";
import { SetNodeOperation, InsertNodeOperation } from "slate";

describe("setNode_insertNode transformation (no-path-shift)", () => {
	it("should not shift root-level sibling insertion after set_node", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { id: 1 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([2]);
	});

	it("should not shift root-level insertion before set_node", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { id: 2 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([1]);
	});

	it("should not shift nested non-ancestor insertion", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { id: 3 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 2]);
	});

	it("should not shift nested insertion on different branch", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0, 1],
			node: { id: 4 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([0, 1]);
	});

	it("should not shift nested sibling insertion", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1, 1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: { id: 5 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 2]);
	});

	it("should not shift same node insertion path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { id: 6 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([2]);
	});

	it("should chain multiple set_node operations without shift", () => {
		const setA: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const setB: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1],
			node: { id: 7 },
		};

		const r1 = setNode_insertNode(setA, toTransform);
		const result = setNode_insertNode(setB, r1);
		expect(result.path).toEqual([2, 1]);
	});

	it("should preserve additional properties on InsertNodeOperation", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { id: 8 },
			extra: true,
		} as any;

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.extra).toBe(true);
	});

	it("should not shift deep nested descendant insertion", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0, 2],
			node: { id: 9 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 0, 2]);
	});

	it("should not shift direct child insertion", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: { id: 10 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 0]);
	});

	it("should not shift parent insertion when setting its child", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1, 0],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { id: 11 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([1]);
	});

	it("should handle batch insertNode operations without shift", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const ops: InsertNodeOperation[] = [
			{ type: "insert_node", path: [3], node: { id: 12 } },
			{ type: "insert_node", path: [4], node: { id: 13 } },
		];

		const results = ops.map(op => setNode_insertNode(confirmed, op));
		expect(results.map(r => r.path)).toEqual([[3], [4]]);
	});

	it("should preserve type property", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: { id: 14 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.type).toBe("insert_node");
	});

	it("should not mutate the original toTransform", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2],
			node: { id: 15 },
		};
		const original = {
			...toTransform,
			path: [...toTransform.path],
			node: { ...toTransform.node },
		};

		setNode_insertNode(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});

	// Additional sanity checks:
	it("should not shift when confirmed path is sibling but deeper level", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1, 1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2, 5],
			node: { id: 16 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 2, 5]);
	});

	it("should not shift when confirmed path and toTransform share first segment but not ancestor", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 0, 1],
			node: { id: 17 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([2, 0, 1]);
	});

	it("should not shift for multiple sequential set_node calls", () => {
		const setA: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const setB: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const setC: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [3, 1],
			node: { id: 18 },
		};

		const r1 = setNode_insertNode(setA, toTransform);
		const r2 = setNode_insertNode(setB, r1);
		const result = setNode_insertNode(setC, r2);
		expect(result.path).toEqual([3, 1]);
	});

	it("should handle trivial no-op when toTransform path is empty array", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [],
			node: { id: 19 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([]);
	});

	it("should not shift root-level descendant beyond prefix", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 5],
			node: { id: 20 },
		};

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 5]);
	});

	it("should preserve entire toTransform object properties", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const toTransform: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: { id: 21 },
			extra: { foo: "bar" },
		} as any;

		const result = setNode_insertNode(confirmed, toTransform);
		expect(result).toMatchObject({ extra: { foo: "bar" } });
	});
});
