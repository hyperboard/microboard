import { mergeNode_setNode } from "./mergeNode_setNode";
import { MergeNodeOperation, SetNodeOperation } from "slate";

describe("mergeNode_setNode transformation", () => {
	it("should shift root-level sibling after merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		});
	});

	it("should not shift root-level sibling before merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
		});
	});

	it("should shift nested sibling after merge at depth 1", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 2],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [0, 2],
			properties: {},
			newProperties: {},
		});
	});

	it("should shift nested sibling after merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 5],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 4],
			properties: {},
			newProperties: {},
		});
	});

	it("should not shift nested sibling before merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 2],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 2],
			properties: {},
			newProperties: {},
		});
	});

	it("should leave descendants of merge point unchanged", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [1, 0, 2],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [0, 0, 2],
			properties: {},
			newProperties: {},
		});
	});

	it("should preserve extra properties on SetNodeOperation", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: SetNodeOperation & any = {
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: {},
			extra: true,
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: {},
			extra: true,
		});
	});

	it("should handle chained merges correctly", () => {
		const m1: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const m2: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 1],
			properties: {},
			newProperties: {},
		};
		const i1 = mergeNode_setNode(m1, toTransform);
		const result = mergeNode_setNode(m2, i1);
		expect(result).toEqual({
			type: "set_node",
			path: [0, 1],
			properties: {},
			newProperties: {},
		});
	});

	it("should handle batch operations", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const ops: SetNodeOperation[] = [
			{ type: "set_node", path: [1], properties: {}, newProperties: {} },
			{ type: "set_node", path: [2], properties: {}, newProperties: {} },
		];
		const results = ops.map(op => mergeNode_setNode(confirmed, op));
		expect(results).toEqual([
			{ type: "set_node", path: [0], properties: {}, newProperties: {} },
			{ type: "set_node", path: [1], properties: {}, newProperties: {} },
		]);
	});

	it("should shift second-level sibling after merge at depth 2", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 4, 1],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 3, 1],
			properties: {},
			newProperties: {},
		});
	});

	it("should not shift second-level sibling before merge at depth 2", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [2, 2, 5],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 2, 5],
			properties: {},
			newProperties: {},
		});
	});

	it("should not shift when toTransform.path shorter than merge path at depth", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [3, 1, 2],
			position: 0,
		};
		const toTransform: SetNodeOperation = {
			type: "set_node",
			path: [3, 1],
			properties: {},
			newProperties: {},
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [3, 1],
			properties: {},
			newProperties: {},
		});
	});

	it("should preserve additional properties on SetNodeOperation with nested merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0, 2],
			position: 0,
		};
		const toTransform: SetNodeOperation & any = {
			type: "set_node",
			path: [0, 3],
			properties: { a: 1 },
			newProperties: { b: 2 },
			extra: "value",
		};
		const result = mergeNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [0, 2],
			properties: { a: 1 },
			newProperties: { b: 2 },
			extra: "value",
		});
	});

	it("should handle batch operations at nested depths", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 0,
		};
		const ops: SetNodeOperation[] = [
			{
				type: "set_node",
				path: [1, 2],
				properties: {},
				newProperties: {},
			},
			{
				type: "set_node",
				path: [2, 0],
				properties: {},
				newProperties: {},
			},
			{
				type: "set_node",
				path: [1, 1, 5],
				properties: {},
				newProperties: {},
			},
		];
		const results = ops.map(op => mergeNode_setNode(confirmed, op));
		expect(results).toEqual([
			{
				type: "set_node",
				path: [1, 1],
				properties: {},
				newProperties: {},
			},
			{
				type: "set_node",
				path: [2, 0],
				properties: {},
				newProperties: {},
			},
			{
				type: "set_node",
				path: [1, 0, 5],
				properties: {},
				newProperties: {},
			},
		]);
	});
});
