import { mergeNode_removeText } from "./mergeNode_removeText";
import { MergeNodeOperation, RemoveTextOperation, Path } from "slate";

describe("mergeNode_removeText transformation", () => {
	it("should add merge position to offset when paths equal", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 3,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 4,
			text: "abcd",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0],
			offset: 7,
			text: "abcd",
		});
	});

	it("should shift root-level sibling after merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 2,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 1,
			text: "x",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 1,
			text: "x",
		});
	});

	it("should not shift root-level sibling before merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2],
			position: 5,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 2,
			text: "yz",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 2,
			text: "yz",
		});
	});

	it("should shift nested sibling after merge at depth 1", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 0,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 3,
			text: "foo",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 2],
			offset: 3,
			text: "foo",
		});
	});

	it("should shift nested sibling after merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 2],
			position: 1,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2, 3],
			offset: 4,
			text: "bar",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2, 2],
			offset: 4,
			text: "bar",
		});
	});

	it("should not shift nested sibling before merge at parent level", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 3],
			position: 2,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2, 1],
			offset: 5,
			text: "baz",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [2, 1],
			offset: 5,
			text: "baz",
		});
	});

	it("should shift deep descendant beyond merge prefix", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 0,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0, 2],
			offset: 6,
			text: "qux",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 0, 2],
			offset: 6,
			text: "qux",
		});
	});

	it("should preserve additional properties on RemoveTextOperation", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 1,
		};
		const toTransform: RemoveTextOperation & any = {
			type: "remove_text",
			path: [2],
			offset: 0,
			text: "meta",
			bold: true,
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 0,
			text: "meta",
			bold: true,
		});
	});

	it("should handle chained merges correctly", () => {
		const m1: MergeNodeOperation = {
			type: "merge_node",
			path: [1],
			position: 2,
		};
		const m2: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 1,
		};
		const original: RemoveTextOperation = {
			type: "remove_text",
			path: [2, 1],
			offset: 3,
			text: "chain",
		};
		const i1 = mergeNode_removeText(m1, original);
		const result = mergeNode_removeText(m2, i1);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 1],
			offset: 3,
			text: "chain",
		});
	});

	it("should handle batch operations", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 1,
		};
		const ops: RemoveTextOperation[] = [
			{ type: "remove_text", path: [1], offset: 1, text: "a" },
			{ type: "remove_text", path: [2], offset: 2, text: "b" },
		];
		const results = ops.map(op => mergeNode_removeText(confirmed, op));
		expect(results).toEqual([
			{ type: "remove_text", path: [0], offset: 1, text: "a" },
			{ type: "remove_text", path: [1], offset: 2, text: "b" },
		]);
	});

	it("should not shift when toTransform.path shorter than merge path", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 1],
			position: 3,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 4,
			text: "short",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 4,
			text: "short",
		});
	});

	it("should shift multi-depth nested sibling after merge", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [1, 2, 3],
			position: 0,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2, 4, 5],
			offset: 7,
			text: "deep",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 2, 3, 5],
			offset: 7,
			text: "deep",
		});
	});

	it("should not shift on branch mismatch", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [2, 2],
			position: 0,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2, 3],
			offset: 8,
			text: "mismatch",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 2, 3],
			offset: 8,
			text: "mismatch",
		});
	});

	it("should handle zero-length text removal", () => {
		const confirmed: MergeNodeOperation = {
			type: "merge_node",
			path: [0],
			position: 2,
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 0,
			text: "",
		};
		const result = mergeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0],
			offset: 0,
			text: "",
		});
	});
});
