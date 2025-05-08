import { insertNode_setNode } from "./insertNode_setNode";
import { InsertNodeOperation, SetNodeOperation } from "slate";

describe("insertNode_setNode transformation", () => {
	const dummyNode = { type: "dummy", children: [] } as any;
	const props = { foo: 1 };
	const newProps = { bar: 2 };

	it("should shift set_node path at root when insertion at same index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should shift set_node path at root when insertion before transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [3],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should not shift when insertion after transform at root-level", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [3],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should shift set_node path at second level when sibling insertion before it", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1, 3],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should shift set_node path at second level when insertion index equals transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 2],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1, 3],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should not shift set_node path at second level when insertion index greater than transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 3],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1, 2],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should shift set_node path when insertion is ancestor of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0, 5],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1, 5],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should not shift when insertion is descendant of transform path", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should shift set_node path when insertion in different branch before root-level transform", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1, 0],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should shift set_node path at third level when insertion index equals transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 0],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 1, 0],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 1, 1],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should shift set_node path at third level when insertion index before transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 0],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 1, 2],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 1, 3],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should not shift set_node path at third level when insertion index greater than transform index", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [2, 1, 3],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 1, 1],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 1, 1],
			properties: props,
			newProperties: newProps,
		});
	});

	it("should preserve additional properties on SetNodeOperation", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [1],
			node: dummyNode,
		};
		const toTransform: SetNodeOperation & any = {
			type: "set_node",
			path: [1],
			properties: props,
			newProperties: newProps,
			customFlag: true,
		};
		const result = insertNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2],
			properties: props,
			newProperties: newProps,
			customFlag: true,
		});
	});

	it("should handle batch operations", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const ops: SetNodeOperation[] = [
			{
				type: "set_node",
				path: [0],
				properties: props,
				newProperties: newProps,
			},
			{
				type: "set_node",
				path: [1],
				properties: props,
				newProperties: newProps,
			},
			{
				type: "set_node",
				path: [2, 0],
				properties: props,
				newProperties: newProps,
			},
		];
		const results = ops.map(op => insertNode_setNode(confirmed, op));
		expect(results).toEqual([
			{
				type: "set_node",
				path: [1],
				properties: props,
				newProperties: newProps,
			},
			{
				type: "set_node",
				path: [2],
				properties: props,
				newProperties: newProps,
			},
			{
				type: "set_node",
				path: [3, 0],
				properties: props,
				newProperties: newProps,
			},
		]);
	});

	it("should not mutate the original SetNodeOperation object", () => {
		const confirmed: InsertNodeOperation = {
			type: "insert_node",
			path: [0],
			node: dummyNode,
		};
		const original: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: props,
			newProperties: newProps,
		};
		const result = insertNode_setNode(confirmed, original);
		expect(result).not.toBe(original);
		expect(original).toEqual({
			type: "set_node",
			path: [1],
			properties: props,
			newProperties: newProps,
		});
	});
});
