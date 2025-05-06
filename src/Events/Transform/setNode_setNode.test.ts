import { setNode_setNode } from "./setNode_setNode";
import { SetNodeOperation } from "slate";

describe("setNode_setNode transformation", () => {
	it("should merge newProperties into empty toTransform", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: { x: 10 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result.properties).toEqual({ x: 10 });
		expect(result.newProperties).toEqual({ x: 10 });
	});

	it("should add non-overlapping newProperties", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0, 2],
			properties: { a: 1 },
			newProperties: { b: 2 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0, 2],
			properties: { a: 1 },
			newProperties: { c: 3 },
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result.properties).toEqual({ a: 1, b: 2 });
		expect(result.newProperties).toEqual({ c: 3, b: 2 });
	});

	it("should override overlapping newProperties keys in order", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: { k: 5 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: { k: 1, m: 3 },
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result.newProperties).toEqual({ k: 5, m: 3 });
	});

	it("should preserve existing properties not in newProperties", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [3],
			properties: { old: true },
			newProperties: { new: false },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [3],
			properties: { old: true, v: 1 },
			newProperties: {},
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result.properties).toEqual({ old: true, v: 1, new: false });
	});

	it("should not merge when paths differ", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: { z: 9 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: { p: 1 },
			newProperties: { q: 2 },
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result).toEqual(toTransform);
	});

	it("should not mutate original toTransform operation", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: { a: 1 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: { b: 2 },
			newProperties: { c: 3 },
		};
		const original = {
			...toTransform,
			properties: { ...toTransform.properties },
			newProperties: { ...toTransform.newProperties },
		};
		setNode_setNode(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});

	it("should preserve type and path", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [5],
			properties: {},
			newProperties: { x: 1 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [5],
			properties: {},
			newProperties: {},
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result.type).toBe("set_node");
		expect(result.path).toEqual([5]);
	});

	it("should handle nested path equality", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [1, 2, 3],
			properties: {},
			newProperties: { n: 1 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2, 3],
			properties: {},
			newProperties: { m: 2 },
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result.properties).toEqual({ n: 1 });
		expect(result.newProperties).toEqual({ m: 2, n: 1 });
	});

	it("should shallow merge nested objects", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: { style: { c: "red" } },
			newProperties: { style: { fs: 12 } },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: { style: { c: "red" } },
			newProperties: {},
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result.properties.style).toEqual({ fs: 12 });
	});

	it("should batch merge for multiple transformations", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: { t: "x" },
		};
		const ops: SetNodeOperation[] = [
			{ type: "set_node", path: [2], properties: {}, newProperties: {} },
			{
				type: "set_node",
				path: [3],
				properties: {},
				newProperties: { u: "y" },
			},
		];

		const results = ops.map(op => setNode_setNode(confirmed, op));
		expect(results).toEqual([
			{
				type: "set_node",
				path: [2],
				properties: { t: "x" },
				newProperties: { t: "x" },
			},
			{
				type: "set_node",
				path: [3],
				properties: {},
				newProperties: { u: "y" },
			},
		]);
	});

	it("should apply sequential merges in order", () => {
		const c1: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: { a: 1 },
		};
		const c2: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: { a: 1 },
			newProperties: { b: 2 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [0],
			properties: {},
			newProperties: {},
		};
		const r1 = setNode_setNode(c1, toTransform);
		const r2 = setNode_setNode(c2, r1);
		expect(r2.properties).toEqual({ a: 1, b: 2 });
		expect(r2.newProperties).toEqual({ a: 1, b: 2 });
	});

	it("should override keys in properties even if toTransform.properties has other keys", () => {
		const confirmed: SetNodeOperation = {
			type: "set_node",
			path: [4],
			properties: { x: 0, y: 0 },
			newProperties: { x: 9 },
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [4],
			properties: { x: 0, y: 0, z: 3 },
			newProperties: {},
		};
		const result = setNode_setNode(confirmed, toTransform);
		expect(result.properties).toEqual({ x: 9, y: 0, z: 3 });
	});
});
