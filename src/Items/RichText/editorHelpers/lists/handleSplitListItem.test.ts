import { createEditor, Descendant, Node } from "slate";
import { withReact } from "slate-react";
import { handleSplitListItem } from "./handleSplitListItem";
import { CustomEditor } from "../../Editor/Editor";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { TextNode } from "../../Editor/TextNode";
import { BulletedListNode, NumberedListNode } from "../../Editor/BlockNode";

// Define the extended editor type for tests
type TestEditor = CustomEditor & {
	createParagraphNode: (text: string) => {
		type: "paragraph";
		children: TextNode[];
	};
};

describe("handleSplitListItem", () => {
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

		// Real implementation of structuredClone if not available
		global.structuredClone =
			global.structuredClone || (obj => JSON.parse(JSON.stringify(obj)));

		// Add createParagraphNode method to editor
		editor.createParagraphNode = (text: string) => ({
			type: "paragraph",
			children: [createTextNode(text)],
		});
	});

	it("should return false when there is no selection", () => {
		editor.selection = null;
		expect(handleSplitListItem(editor)).toBe(false);
	});

	it("should return false when selection is not collapsed", () => {
		// Setup document
		editor.children = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("First item")],
							},
						],
					},
				],
			},
		];

		// Non-collapsed selection
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 0], offset: 5 },
		};

		expect(handleSplitListItem(editor)).toBe(false);
	});

	it("should return false when not in a list item", () => {
		// Setup document with a paragraph (not a list)
		editor.children = [
			{
				type: "paragraph",
				children: [createTextNode("Not a list item")],
			},
		];

		// Cursor at the start of paragraph
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		expect(handleSplitListItem(editor)).toBe(false);
	});

	it("should split non-empty list item into two list items", () => {
		// Initial document state
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("First item")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor in the middle of the first list item
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 5 },
			focus: { path: [0, 0, 0, 0], offset: 5 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// "First" in first item, " item" in second, and "Second item" in third
		const expectedDocument = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("First")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								paddingTop: 0.5,
								children: [createTextNode(" item")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
				],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	it("should convert empty list item to paragraph when it's the only child", () => {
		// Initial document state with an empty list item
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									createTextNode(""), // Empty text
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the start of the empty list item
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 0], offset: 0 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// List should be removed and replaced with a paragraph
		const expectedDocument = [
			{
				type: "paragraph",
				paddingTop: 0.5,
				children: [createTextNode("")],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	it("should preserve items after the split empty list item", () => {
		// Initial document state with an empty first list item and another item after it
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									createTextNode(""), // Empty text
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the start of the empty list item
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 0], offset: 0 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// Empty item becomes paragraph, followed by a list with remaining items
		const expectedDocument = [
			{
				type: "paragraph",
				paddingTop: 0.5,
				children: [createTextNode("")],
			},
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
				],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	it("should handle splitting in an ordered list", () => {
		// Initial document state with an ordered list
		const initialDocument: Descendant[] = [
			{
				type: "ol_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									createTextNode(""), // Empty text
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the start of the empty list item
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 0], offset: 0 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// Empty item becomes paragraph, followed by an ordered list with remaining items
		const expectedDocument = [
			{
				type: "paragraph",
				paddingTop: 0.5,
				children: [createTextNode("")],
			},
			{
				type: "ol_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
				],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	it("should handle multiple list items after the split point", () => {
		// Initial document state with multiple items after the empty first item
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									createTextNode(""), // Empty text
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Third item")],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the start of the empty list item
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 0], offset: 0 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// Empty item becomes paragraph, followed by a list with all remaining items
		const expectedDocument = [
			{
				type: "paragraph",
				paddingTop: 0.5,
				children: [createTextNode("")],
			},
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Third item")],
							},
						],
					},
				],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	// NEW TEST: Split list between items
	it("should split list between two non-empty items", () => {
		// Initial document state
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("First item")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Third item")],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the end of the first list item
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 10 },
			focus: { path: [0, 0, 0, 0], offset: 10 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// "First item" in first list item, with a new empty list item after it
		const expectedDocument = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("First item")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								paddingTop: 0.5,
								children: [createTextNode("")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Second item")],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Third item")],
							},
						],
					},
				],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	// NEW TEST: Nested lists - split inner list item
	it("should handle splitting a nested list item", () => {
		// Initial document state with nested lists
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Parent item")],
							},
							{
								type: "ul_list",
								listLevel: 1,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode(
														"Nested item text",
													),
												],
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor in the middle of the nested list item
		editor.selection = {
			anchor: { path: [0, 0, 1, 0, 0, 0], offset: 6 },
			focus: { path: [0, 0, 1, 0, 0, 0], offset: 6 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// Nested list item split into two items
		const expectedDocument = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Parent item")],
							},
							{
								type: "ul_list",
								listLevel: 1,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode("Nested"),
												],
											},
										],
									},
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												paddingTop: 0.5,
												children: [
													createTextNode(
														" item text",
													),
												],
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	// NEW TEST: Nested lists - convert empty nested list item to paragraph
	it("should handle an empty nested list item", () => {
		// Initial document state with nested empty list item
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Parent item")],
							},
							{
								type: "ul_list",
								listLevel: 1,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode(""), // Empty nested item
												],
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the start of the empty nested list item
		editor.selection = {
			anchor: { path: [0, 0, 1, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 1, 0, 0, 0], offset: 0 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// Empty nested item removed, replaced with paragraph within parent item
		const expectedDocument = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Parent item")],
							},
							{
								type: "paragraph",
								paddingTop: 0.5,
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

	// NEW TEST: Nested lists with items after the split
	it("should handle splitting a nested list with items after the split", () => {
		// Initial document state with nested list having multiple items
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Parent item")],
							},
							{
								type: "ul_list",
								listLevel: 1,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode(""), // Empty first nested item
												],
											},
										],
									},
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode(
														"Second nested item",
													),
												],
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the start of the empty nested list item
		editor.selection = {
			anchor: { path: [0, 0, 1, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 1, 0, 0, 0], offset: 0 },
		};

		// Execute operation
		const result = handleSplitListItem(editor);

		// Expected document after operation:
		// Empty nested item becomes paragraph, nested list continues with remaining items
		const expectedDocument = [
			{
				type: "ul_list",
				listLevel: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("Parent item")],
							},
							{
								type: "paragraph",
								paddingTop: 0.5,
								children: [createTextNode("")],
							},
							{
								type: "ul_list",
								listLevel: 1,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode(
														"Second nested item",
													),
												],
											},
										],
									},
								],
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
