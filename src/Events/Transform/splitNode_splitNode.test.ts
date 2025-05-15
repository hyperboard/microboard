import { splitNode_splitNode } from "./splitNode_splitNode";
import { SplitNodeOperation } from "slate";
import { Path } from "slate";

describe("splitNode_splitNode transformation", () => {
	it("1. should not change path or position when confirmed split is on a different branch", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 2,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2, 0],
			position: 5,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 0],
			position: 5,
			properties: {},
		});
	});

	it("2. should shift root-level sibling after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [3], // 2 > 1 ⇒ 3
			position: 0,
			properties: {},
		});
	});

	it("3. should not shift root-level sibling before split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 4,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 4,
			properties: {},
		});
	});

	it("4. should subtract position when splitting same node (shallow)", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 5,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1],
			position: 3, // 5 - 2
			properties: {},
		});
	});

	it("5. should not subtract position when confirmed position > toTransform position (shallow)", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 3,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 2,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0],
			position: 2,
			properties: {},
		});
	});

	it("6. should not change descendant under confirmed split (path transform only for siblings)", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2, 1],
			position: 4,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 1, 1], // +1 for first one bc of path, -1 for 2nd bc of position 1
			position: 4,
			properties: {},
		});
	});

	it("7. should shift sibling at second level under same parent", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 0,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 2],
			position: 3,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 3], // 2 > 1 ⇒ 3
			position: 3,
			properties: {},
		});
	});

	it("8. should not shift sibling at second level before confirmed split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 2],
			position: 1,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0, 1],
			position: 2,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0, 1],
			position: 2,
			properties: {},
		});
	});

	it("9. should subtract and transform path for same deep node", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 2,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 5,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 1], // transformPath on same deep path bumps index at depth 2
			position: 3, // 5 - 2
			properties: {},
		});
	});

	it("10. should subtract but not transform path for same shallow node with length=1", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 1,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 4,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2], // depth=1 ⇒ no transformPath
			position: 3, // 4 - 1
			properties: {},
		});
	});

	it("11. should chain two confirmed splits cumulatively", () => {
		const s1: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: {},
		};
		const s2: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const original: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 5,
			properties: {},
		};
		const r1 = splitNode_splitNode(s1, original); // path->[3], pos=5
		const r2 = splitNode_splitNode(s2, r1); // path->[4], pos=5
		expect(r2).toEqual({
			type: "split_node",
			path: [4],
			position: 5,
			properties: {},
		});
	});

	it("12. should preserve properties object", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: { meta: true },
		};
		const props = { bold: false };
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 1,
			properties: props,
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result.properties).toBe(props);
		expect(result.position).toBe(1);
	});

	it("13. should handle multiple toTransform siblings after split", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const ops: SplitNodeOperation[] = [
			{ type: "split_node", path: [1], position: 0, properties: {} },
			{ type: "split_node", path: [2], position: 1, properties: {} },
			{ type: "split_node", path: [3], position: 2, properties: {} },
		];
		const results = ops.map(op => splitNode_splitNode(confirmed, op));
		expect(results).toEqual([
			{ type: "split_node", path: [2], position: 0, properties: {} },
			{ type: "split_node", path: [3], position: 1, properties: {} },
			{ type: "split_node", path: [4], position: 2, properties: {} },
		]);
	});

	it("14. should handle confirmed split at end of siblings", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 0,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [3],
			position: 4,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [4], // 3>2⇒4
			position: 4,
			properties: {},
		});
	});

	it("15. should not change path when confirmed split on deeper ancestor but position > 0", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 1,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 2,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1], // splitting child doesn't affect parent path
			position: 2,
			properties: {},
		});
	});

	it("16. should update path for sibling in subtree below confirmed ancestor", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [1],
			position: 0,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 2],
			position: 3,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [2, 2], // head 1⇒2 for subtree
			position: 3,
			properties: {},
		});
	});

	it("17. should not modify toTransform when both on unrelated branches", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0, 2],
			position: 1,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [1, 0],
			position: 5,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [1, 0],
			position: 5,
			properties: {},
		});
	});

	it("18. should handle confirmed split at root zero position", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 0,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 3,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [0], // 0-0 is less than 0-3
			position: 3, // subtraction: 3 - 0 = 3
			properties: {},
		});
	});

	it("19. should preserve immutability of toTransform object", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [0],
			position: 1,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [2],
			position: 4,
			properties: { preserve: true },
		};
		const copy = { ...toTransform, path: [...toTransform.path] };
		splitNode_splitNode(confirmed, toTransform);
		expect(toTransform).toEqual(copy);
	});

	it("20. should subtract position only and not transform path when confirmed.path.length == 1 and samePath", () => {
		const confirmed: SplitNodeOperation = {
			type: "split_node",
			path: [3],
			position: 2,
			properties: {},
		};
		const toTransform: SplitNodeOperation = {
			type: "split_node",
			path: [3],
			position: 7,
			properties: {},
		};
		const result = splitNode_splitNode(confirmed, toTransform);
		expect(result).toEqual({
			type: "split_node",
			path: [3], // no transformPath because path length == 1
			position: 5, // 7 - 2
			properties: {},
		});
	});
});
