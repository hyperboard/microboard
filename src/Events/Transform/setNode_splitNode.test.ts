import { setNode_splitNode } from "./setNode_splitNode";
import { SetNodeOperation, SplitNodeOperation } from "slate";

describe("setNode_splitNode transformation", () => {
	it("should merge newProperties into empty properties and keep path unchanged", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: { a: 1 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2],
			position: 0,
			properties: { a: 1 },
		});
	});

	it("should override existing properties with newProperties", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: { a: 0, b: 2 },
			newProperties: { a: 5 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 1,
			properties: { a: 0, b: 2 },
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result.properties).toEqual({ a: 5, b: 2 });
	});

	it("should add non-overlapping newProperties and retain existing", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1, 1],
			properties: { x: 10 },
			newProperties: { y: 20 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 2,
			properties: { x: 10 },
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result.properties).toEqual({ x: 10, y: 20 });
	});

	it("should merge multiple keys from newProperties", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [3],
			properties: {},
			newProperties: { a: 1, c: 3 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [3],
			position: 0,
			properties: {},
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result.properties).toEqual({ a: 1, c: 3 });
	});

	it("should leave properties unchanged when newProperties is empty", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: { p: true },
			newProperties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 3,
			properties: { p: true },
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result.properties).toEqual({ p: true });
	});

	it("should preserve toTransform position and type", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: { a: 1 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 5,
			properties: {},
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result.type).toBe("split_node");
		expect(result.position).toBe(5);
	});

	it("should not change path when transformPath has no effect", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: { z: 9 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 1,
			properties: {},
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result.path).toEqual([0]);
	});

	it("should not mutate original toTransform operation", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: { x: 7 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 2,
			properties: { x: 0 },
		};
		const original = {
			...toTransform,
			properties: { ...toTransform.properties },
		};

		setNode_splitNode(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});

	it("should handle nested descendant path unchanged", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: { a: 2 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 0,
			properties: {},
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result.path).toEqual([1, 1]);
	});

	it("should merge nested property objects shallowly", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: { style: { color: "red" } },
			newProperties: { style: { fontSize: 12 } },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: { style: { color: "red" } },
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result.properties.style).toEqual({ fontSize: 12 });
	});

	it("should batch merge properties for multiple operations", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: { tag: "h1" },
		};
		const ops: SplitNodeOperation[] = [
			{ type: "split_node", path: [1], position: 0, properties: {} },
			{
				type: "split_node",
				path: [2],
				position: 1,
				properties: { tag: "p" },
			},
		];

		const results = ops.map(op => setNode_splitNode(confirmed, op));
		expect(results).toEqual([
			{
				type: "split_node",
				path: [1],
				position: 0,
				properties: { tag: "h1" },
			},
			{
				type: "split_node",
				path: [2],
				position: 1,
				properties: { tag: "h1" },
			},
		]);
	});

	it("should sequentially apply newProperties in order", () => {
		const confirmed1: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: { a: 1 },
		};
		const confirmed2: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: { a: 1 },
			newProperties: { b: 2 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};

		const r1 = setNode_splitNode(confirmed1, toTransform);
		const result = setNode_splitNode(confirmed2, r1);
		expect(result.properties).toEqual({ a: 1, b: 2 });
	});
	it("should not shift path when setting node does not affect split_node structure", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: { m: 42 },
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 5,
			properties: { x: 1 },
		};

		const result = setNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2],
			position: 5,
			properties: { x: 1, m: 42 },
		});
	});
});

it("should not shift path for nested descendants when setting node only merges properties", () => {
	const confirmed: SetNodeOperation = {
		type: "set_node",
		path: [1],
		properties: {},
		newProperties: { m: 99 },
	};
	const toTransform: SplitNodeOperation = {
		type: "split_node",
		path: [1, 2],
		position: 3,
		properties: { y: 2 },
	};

	const result = setNode_splitNode(confirmed, toTransform);
	expect(result).toEqual({
		type: "split_node",
		path: [1, 2],
		position: 3,
		properties: { y: 2, m: 99 },
	});
});

it("should not shift path when set_node follows split_node in sibling branch", () => {
	const confirmed: SetNodeOperation = {
		type: "set_node",
		path: [2],
		properties: {},
		newProperties: { z: 7 },
	};
	const toTransform: SplitNodeOperation = {
		type: "split_node",
		path: [1],
		position: 2,
		properties: { a: 3 },
	};

	const result = setNode_splitNode(confirmed, toTransform);
	expect(result).toEqual({
		type: "split_node",
		path: [1],
		position: 2,
		properties: { a: 3, z: 7 },
	});
});
