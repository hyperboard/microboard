import { splitNode_removeNode } from "./splitNode_removeNode";
import { SplitNodeOperation, RemoveNodeOperation } from "slate";

describe("splitNode_removeNode transformation", () => {
	it("should shift root-level sibling nodes after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [3] });
	});

	it("should not shift root-level nodes before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1] });
	});

	it("should shift nested first index for non-ancestor branch", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [2, 2] });
	});

	it("should not shift nested nodes before split at different branches", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [0, 1] });
	});

	it("should shift nested sibling indices after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1, 3] });
	});

	it("should not shift same node path", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [2] });
	});

	it("should chain multiple splits correctly", () => {
		const confirmedA: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const confirmedB: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 1],
		};

		const r1 = splitNode_removeNode(confirmedA, toTransform);
		const result = splitNode_removeNode(confirmedB, r1);
		expect(result).toEqual({ type: "remove_node", path: [4, 1] });
	});

	it("should preserve additional properties on RemoveNodeOperation", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
			node: { id: 123 },
		} as any;

		const result = splitNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_node",
			path: [3],
			node: { id: 123 },
		});
	});

	it("should support transforming multiple operations in batch", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransforms: RemoveNodeOperation[] = [
			{ type: "remove_node", path: [3] },
			{ type: "remove_node", path: [4] },
		];

		const results = toTransforms.map(op =>
			splitNode_removeNode(confirmed, op),
		);
		expect(results).toEqual([
			{ type: "remove_node", path: [4] },
			{ type: "remove_node", path: [5] },
		]);
	});

	it("should not shift deeply nested descendants beyond prefix", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0, 2],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1, 0, 2] });
	});

	it("should shift direct child nodes for root-level split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		// direct child of split: child index (0) should remain, parent index bump to 2
		expect(result).toEqual({ type: "remove_node", path: [2, 0] });
	});

	it("should shift direct children of a nested split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		// direct child of nested split: segment at depth 2 increments
		expect(result).toEqual({ type: "remove_node", path: [0, 1, 3] });
	});

	it("should not shift parent node when splitting its child", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		// splitting deeper child should not affect parent removal
		expect(result).toEqual({ type: "remove_node", path: [1] });
	});

	it("should shift nested sibling for deeper-level split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		// sibling at same nested level increments
		expect(result).toEqual({ type: "remove_node", path: [1, 2] });
	});

	it("should shift root index for direct descendant of root split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 0],
		};

		const result = splitNode_removeNode(confirmed, toTransform);
		// root-level split moves its first-level children
		expect(result).toEqual({ type: "remove_node", path: [1, 0] });
	});
});
