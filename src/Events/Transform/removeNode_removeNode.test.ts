import { removeNode_removeNode } from "./removeNode_removeNode";
import { RemoveNodeOperation } from "slate";

describe("removeNode_removeNode transformation", () => {
	it("should shift root-level sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1] });
	});

	it("should not shift root-level sibling before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1] });
	});

	it("should shift nested sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1, 1] });
	});

	it("should not shift nested sibling before removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1, 1] });
	});

	it("should shift deep nested sibling after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 2],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 3, 0],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [0, 2, 0] });
	});

	it("should shift sibling on different branch at root level", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 1],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1, 1] });
	});

	it("should leave descendant paths unchanged", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 0, 2],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1, 0, 2] });
	});

	it("should not affect shorter paths", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [0, 1] });
	});

	it("should shift removal at sibling parent level", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 3],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 5, 1],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [2, 4, 1] });
	});

	it("should not shift when index is lower at same parent", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 3],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 2, 4],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [2, 2, 4] });
	});

	it("should not shift root-level deeper path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 0],
		};
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 0],
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [2, 0] });
	});

	it("should preserve additional properties", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveNodeOperation & any = {
			type: "remove_node",
			path: [2],
			meta: true,
		};
		const result = removeNode_removeNode(confirmed, toTransform);
		expect(result).toEqual({ type: "remove_node", path: [1], meta: true });
	});

	it("should handle chained removals correctly", () => {
		const r1: RemoveNodeOperation = { type: "remove_node", path: [1] };
		const r2: RemoveNodeOperation = { type: "remove_node", path: [0] };
		const toTransform: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 1],
		};
		const i1 = removeNode_removeNode(r1, toTransform);
		const result = removeNode_removeNode(r2, i1);
		expect(result).toEqual({ type: "remove_node", path: [0, 1] });
	});

	it("should handle batch operations", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const ops: RemoveNodeOperation[] = [
			{ type: "remove_node", path: [1] },
			{ type: "remove_node", path: [2] },
		];
		const results = ops.map(op => removeNode_removeNode(confirmed, op));
		expect(results).toEqual([
			{ type: "remove_node", path: [0] },
			{ type: "remove_node", path: [1] },
		]);
	});
});
