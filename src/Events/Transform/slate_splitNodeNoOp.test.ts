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
});
