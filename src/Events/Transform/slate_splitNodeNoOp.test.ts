import { createEditor, Node } from "slate";

describe("Split Node Operation at Position 0", () => {
	// this test confirms that we can use position 0 as noOp for split node
	it("should not modify the document when splitting text node at position 0", () => {
		const editor = createEditor();

		// Initial document
		const initialValue = [
			{
				type: "paragraph",
				children: [{ text: "Hello world" }],
			},
		];

		// Set the initial value
		editor.children = initialValue;
		editor.selection = null;

		// Perform a split node operation at position 0
		const splitOp = {
			type: "split_node",
			path: [0, 0],
			position: 0,
			properties: {},
		};

		// Apply the operation
		editor.apply(splitOp);

		// Check that the document remains unchanged
		expect(editor.children).toEqual(initialValue);
		expect(Node.string(editor.children[0])).toBe("Hello world");
		expect(editor.children[0].children.length).toBe(1);
	});

	it("should apply split operation without normalization", () => {
		const editor = createEditor();

		// Initial document
		const initialValue = [
			{
				type: "paragraph",
				children: [{ text: "Hello world" }],
			},
		];

		// Set the initial value
		editor.children = initialValue;
		editor.selection = null;

		// Disable normalization temporarily
		const normalizeNode = editor.normalizeNode;
		editor.normalizeNode = () => {};

		// Perform a split node operation at position 2 (split after "He")
		const splitOp = {
			type: "split_node",
			path: [0, 0],
			position: 0,
			properties: {},
		};

		// Apply the operation
		editor.apply(splitOp);

		// Check the document has been split correctly
		expect(editor.children[0].children.length).toBe(2);
		expect(Node.string(editor.children[0].children[0])).toBe("");
		expect(Node.string(editor.children[0].children[1])).toBe("Hello world");

		// Restore normalization
		editor.normalizeNode = normalizeNode;
	});
});
