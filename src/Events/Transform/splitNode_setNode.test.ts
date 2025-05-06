import { splitNode_setNode } from "./splitNode_setNode";
import { SplitNodeOperation, SetNodeOperation } from "slate";

describe("splitNode_setNode transformation", () => {
	it("should increment root-level sibling paths after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "set_node",
			path: [3],
			properties: { foo: "bar" },
		});
	});

	it("should not modify path for root-level nodes before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([1]);
	});

	it("should shift first segment for non-descendant deep paths", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([2, 2]);
	});

	it("should not modify non-descendant deep paths when before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 3],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 3]);
	});

	it("should shift descendant paths for split on ancestor", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 0],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([2, 0]);
	});

	it("should shift nested sibling index", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 3]);
	});

	it("should not modify nested sibling before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 1],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 1]);
	});

	it("should handle multiple siblings after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransforms: SetNodeOperation[] = [
			{ type: "set_node", path: [1], properties: { a: 1 } },
			{ type: "set_node", path: [2], properties: { b: 2 } },
			{ type: "set_node", path: [3], properties: { c: 3 } },
		];

		const results = toTransforms.map(op =>
			splitNode_setNode(confirmed, op),
		);
		expect(results.map(r => r.path)).toEqual([[2], [3], [4]]);
	});

	it("should handle same path unchanged", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([2]);
	});

	it("should handle deeper equal path descendant", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 1, 2],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 1, 2]);
	});

	it("should shift deep descendant correctly", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 1, 3],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([2, 1, 3]);
	});

	it("should shift nested deep siblings", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0, 2, 1],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([0, 3, 1]);
	});

	it("should not shift for sibling outside subtree", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0, 5],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([0, 5]);
	});

	it("should shift siblings at same nested level", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: { foo: "bar" },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 3]);
	});

	it("should not mutate the original toTransform operation", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: { foo: "bar" },
		};
		const original = { ...toTransform };

		splitNode_setNode(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});
});
