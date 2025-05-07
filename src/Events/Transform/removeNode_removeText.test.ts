import { removeNode_removeText } from "./removeNode_removeText";
import { RemoveNodeOperation, RemoveTextOperation } from "slate";

describe("removeNode_removeText transformation", () => {
	it("should shift root-level sibling remove_text after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2],
			offset: 3,
			text: "foo",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 3,
			text: "foo",
		});
	});

	it("should not shift remove_text before removal index", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 0,
			text: "bar",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 0,
			text: "bar",
		});
	});

	it("should shift nested non-ancestor remove_text", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 5,
			text: "baz",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 2],
			offset: 5,
			text: "baz",
		});
	});

	it("should not shift remove_text on a different branch", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1],
			offset: 2,
			text: "qux",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 1],
			offset: 2,
			text: "qux",
		});
	});

	it("should shift nested sibling remove_text after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 1],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2],
			offset: 1,
			text: "a",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 1],
			offset: 1,
			text: "a",
		});
	});

	it("should shift nested deeper sibling remove_text after removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1, 2, 3],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2, 4],
			offset: 4,
			text: "deep",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 2, 3],
			offset: 4,
			text: "deep",
		});
	});

	it("should not drop remove_text when path equals removal path", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1],
			offset: 7,
			text: "same",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 7,
			text: "same",
		});
	});

	it("should not shift nested remove_text under removed node", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 3],
			offset: 2,
			text: "under",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 3],
			offset: 2,
			text: "under",
		});
	});

	it("should not affect remove_text with shorter path than removal depth", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1],
			offset: 9,
			text: "short",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 1],
			offset: 9,
			text: "short",
		});
	});

	it("should shift sibling at parent level of removal", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0, 1, 2],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 1, 3],
			offset: 8,
			text: "parent",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 1, 2],
			offset: 8,
			text: "parent",
		});
	});

	it("should shift root-level sibling for deeper paths", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [2, 0, 5],
			offset: 6,
			text: "multi",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0, 5],
			offset: 6,
			text: "multi",
		});
	});

	it("should shift siblings when first segment > removal first segment", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [2, 1],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [3, 0],
			offset: 1,
			text: "seg",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [3, 0],
			offset: 1,
			text: "seg",
		});
	});

	it("should preserve extra properties on RemoveTextOperation", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const toTransform: RemoveTextOperation & { extra: boolean } = {
			type: "remove_text",
			path: [2],
			offset: 0,
			text: "keep",
			extra: true,
		} as any;

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [1],
			offset: 0,
			text: "keep",
			extra: true,
		});
	});

	it("should handle batch removeText transformations", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [1],
		};
		const ops: RemoveTextOperation[] = [
			{ type: "remove_text", path: [2], offset: 2, text: "a" },
			{ type: "remove_text", path: [0], offset: 4, text: "b" },
		];

		const results = ops.map(op => removeNode_removeText(confirmed, op));
		expect(results).toEqual([
			{ type: "remove_text", path: [1], offset: 2, text: "a" },
			{ type: "remove_text", path: [0], offset: 4, text: "b" },
		]);
	});

	it("should not shift nested under root removal when path equals removal prefix", () => {
		const confirmed: RemoveNodeOperation = {
			type: "remove_node",
			path: [0],
		};
		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 3,
			text: "root",
		};

		const result = removeNode_removeText(confirmed, toTransform);
		expect(result).toEqual({
			type: "remove_text",
			path: [0, 0],
			offset: 3,
			text: "root",
		});
	});
});
