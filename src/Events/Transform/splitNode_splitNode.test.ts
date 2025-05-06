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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);

		expect(result).toEqual({
			type: "set_node",
			path: [3],
			properties: {},
			newProperties: { bold: true },
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 2],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1, 3],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 0],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1, 3],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1, 1],
			properties: {},
			newProperties: { bold: true },
		});
	});

	it("should handle multiple siblings after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransforms: SetNodeOperation[] = [
			{
				type: "set_node",
				path: [1],
				properties: {},
				newProperties: { bold: true },
			},
			{
				type: "set_node",
				path: [2],
				properties: {},
				newProperties: { bold: true },
			},
			{
				type: "set_node",
				path: [3],
				properties: {},
				newProperties: { bold: true },
			},
		];

		const results = toTransforms.map(op =>
			splitNode_setNode(confirmed, op),
		);
		expect(results).toEqual([
			{
				type: "set_node",
				path: [2],
				properties: {},
				newProperties: { bold: true },
			},
			{
				type: "set_node",
				path: [3],
				properties: {},
				newProperties: { bold: true },
			},
			{
				type: "set_node",
				path: [4],
				properties: {},
				newProperties: { bold: true },
			},
		]);
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [1, 1, 2],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [2, 1, 3],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [0, 3, 1],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};

		const result = splitNode_setNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "set_node",
			path: [0, 5],
			properties: {},
			newProperties: { bold: true },
		});
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
			properties: {},
			newProperties: { bold: true },
		};
		const original = { ...toTransform };

		splitNode_setNode(confirmed, toTransform);
		expect(toTransform).toEqual(original);
	});
});
