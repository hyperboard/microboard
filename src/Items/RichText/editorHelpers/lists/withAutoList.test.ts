import { createEditor, Descendant } from "slate";
import { withReact } from "slate-react";
import { withAutoList } from "./withAutoList";
import { CustomEditor } from "../../Editor/Editor";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { TextNode } from "../../Editor/TextNode";

// Define the extended editor type for tests
type TestEditor = CustomEditor & {
	clearAllTextNodes: () => void;
};

describe("withAutoList", () => {
	let editor: TestEditor;

	// Helper to create a valid TextNode
	const createTextNode = (text: string): TextNode => ({
		type: "text",
		text,
		bold: false,
		italic: false,
		underline: false,
		overline: false,
		"line-through": false,
		subscript: false,
		superscript: false,
	});

	beforeEach(() => {
		editor = withReact(createEditor()) as TestEditor;

		// Mock clearAllTextNodes function
		editor.clearAllTextNodes = () => {
			const point = { path: [0, 0], offset: 0 };
			editor.selection = { anchor: point, focus: point };
			if (
				editor.children.length > 0 &&
				editor.children[0].children &&
				editor.children[0].children.length > 0
			) {
				const firstTextNode = editor.children[0].children[0];
				if ("text" in firstTextNode) {
					firstTextNode.text = "";
				}
			}
		};

		// Real implementation of structuredClone if not available
		global.structuredClone =
			global.structuredClone || (obj => JSON.parse(JSON.stringify(obj)));
	});

	it("should return false when there is no selection", () => {
		editor.selection = null;
		expect(withAutoList(editor)).toBe(false);
	});

	it("should return false when there is more than one node", () => {
		// Setup document with two paragraphs
		editor.children = [
			{
				type: "paragraph",
				children: [createTextNode("1.")],
			},
			{
				type: "paragraph",
				children: [createTextNode("Second paragraph")],
			},
		];

		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		expect(withAutoList(editor)).toBe(false);
	});

	it("should return false when the only node is not a paragraph", () => {
		// Setup document with a block quote instead of paragraph
		editor.children = [
			{
				type: "heading_one",
				children: [createTextNode("1.")],
			},
		];

		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		expect(withAutoList(editor)).toBe(false);
	});

	it("should return false when the paragraph has multiple children", () => {
		// Setup document with a paragraph having multiple text nodes
		editor.children = [
			{
				type: "paragraph",
				children: [createTextNode("1."), createTextNode(" more text")],
			},
		];

		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		expect(withAutoList(editor)).toBe(false);
	});

	it("should return false when text is not '1.'", () => {
		// Setup document with text that's not "1."
		editor.children = [
			{
				type: "paragraph",
				children: [createTextNode("Not 1.")],
			},
		];

		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		expect(withAutoList(editor)).toBe(false);
	});

	it("should convert paragraph to ordered list when text is '1.'", () => {
		// Setup document with "1." text
		editor.children = [
			{
				type: "paragraph",
				children: [createTextNode("1.")],
			},
		];

		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		// Execute operation
		const result = withAutoList(editor);

		// Expected document after operation:
		// Paragraph should be converted to an ordered list with an empty list item
		const expectedDocument = [
			{
				type: "ol_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("")],
							},
						],
					},
				],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});
});
