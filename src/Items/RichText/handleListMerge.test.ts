import { createEditor, Descendant, Node } from "slate";
import { withReact } from "slate-react";
import { handleListMerge } from "./handleListMerge";
import { CustomEditor } from "./Editor/Editor";
import { describe, it, expect, beforeEach } from "bun:test";

describe("handleListMerge", () => {
	let editor: CustomEditor;

	beforeEach(() => {
		editor = withReact(createEditor()) as CustomEditor;

		// Real implementation of structuredClone if not available
		global.structuredClone =
			global.structuredClone || (obj => JSON.parse(JSON.stringify(obj)));
	});

	it("should return false when there is no selection", () => {
		editor.selection = null;
		expect(handleListMerge(editor)).toBe(false);
	});

	it("should return false when cursor is not at the start of text node", () => {
		// Setup basic document
		editor.children = [
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
						],
					},
				],
			},
		];

		// Save initial state using structuredClone
		const initialChildren = structuredClone(editor.children);

		// Курсор не в начале текстового узла
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 1 },
			focus: { path: [0, 0, 0, 0], offset: 1 },
		};

		expect(handleListMerge(editor)).toBe(false);

		// Проверяем, что документ остался неизменным
		expect(editor.children).toEqual(initialChildren);
	});

	it("should return false when selection is not collapsed", () => {
		// Setup document
		editor.children = [
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
						],
					},
				],
			},
		];

		// Выделение текста (не схлопнуто)
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 0], offset: 5 },
		};

		expect(handleListMerge(editor)).toBe(false);
	});

	it("should merge first list item with parent", () => {
		// Initial document state
		const initialDocument: Descendant[] = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before list" }],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
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
									{ type: "text", text: "Second item" },
								],
							},
						],
					},
				],
			},
			{
				type: "paragraph",
				children: [{ type: "text", text: "After list" }],
			},
		];

		editor.children = initialDocument;

		// Курсор в начале первого элемента списка
		editor.selection = {
			anchor: { path: [1, 0, 0, 0], offset: 0 },
			focus: { path: [1, 0, 0, 0], offset: 0 },
		};

		// Execute operation
		const result = handleListMerge(editor);

		// Expected document after operation
		const expectedDocument = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before list" }],
			},
			{
				type: "paragraph",
				paddingTop: 0,
				children: [{ type: "text", text: "First item" }],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "Second item" },
								],
							},
						],
					},
				],
			},
			{
				type: "paragraph",
				children: [{ type: "text", text: "After list" }],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	it("should merge list item with previous list item", () => {
		// Initial document state
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
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
									{ type: "text", text: "Second item" },
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
									{ type: "text", text: "Third item" },
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Курсор в начале второго элемента списка
		editor.selection = {
			anchor: { path: [0, 1, 0, 0], offset: 0 },
			focus: { path: [0, 1, 0, 0], offset: 0 },
		};

		// Execute operation
		const result = handleListMerge(editor);

		// Expected document after operation
		const expectedDocument = [
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
							{
								type: "paragraph",
								paddingTop: 0,
								children: [
									{ type: "text", text: "Second item" },
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
									{ type: "text", text: "Third item" },
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

	it("should handle removing entire list when merging the only item", () => {
		// Initial document state
		const initialDocument: Descendant[] = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before list" }],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [{ type: "text", text: "Only item" }],
							},
						],
					},
				],
			},
			{
				type: "paragraph",
				children: [{ type: "text", text: "After list" }],
			},
		];

		editor.children = initialDocument;

		// Курсор в начале единственного элемента списка
		editor.selection = {
			anchor: { path: [1, 0, 0, 0], offset: 0 },
			focus: { path: [1, 0, 0, 0], offset: 0 },
		};

		// Переопределяем метод для этого теста, чтобы считать список пустым после удаления элемента
		editor.getAreAllChildrenEmpty = () => true;

		// Execute operation
		const result = handleListMerge(editor);

		// Expected document after operation - list completely removed
		const expectedDocument = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before list" }],
			},
			{
				type: "paragraph",
				paddingTop: 0,
				children: [{ type: "text", text: "Only item" }],
			},
			{
				type: "paragraph",
				children: [{ type: "text", text: "After list" }],
			},
		];

		expect(result).toBe(true);
		expect(editor.children).toEqual(expectedDocument);
	});

	it("should return false for non-list structures", () => {
		// Setup a non-list document structure
		const document: Descendant[] = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Regular paragraph" }],
			},
		];

		editor.children = document;

		// Курсор в начале обычного параграфа
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		const result = handleListMerge(editor);

		expect(result).toBe(false);
		// Document should remain unchanged
		expect(editor.children).toEqual(document);
	});
	it("should handle nested lists correctly when merging first item", () => {
		// Create a document with nested lists
		const initialDocument: Descendant[] = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before list" }],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
							{
								type: "ul_list", // Nested list
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													{
														type: "text",
														text: "Nested item",
													},
												],
											},
										],
									},
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
									{ type: "text", text: "Second item" },
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the beginning of the first list item
		editor.selection = {
			anchor: { path: [1, 0, 0, 0], offset: 0 },
			focus: { path: [1, 0, 0, 0], offset: 0 },
		};

		const result = handleListMerge(editor);

		// Expected document after operation - first list item with nested list should be extracted
		const expectedDocument = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before list" }],
			},
			{
				type: "paragraph",
				paddingTop: 0,
				children: [{ type: "text", text: "First item" }],
			},
			{
				type: "ul_list",
				paddingTop: 0,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "Nested item" },
								],
							},
						],
					},
				],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "Second item" },
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

	it("should handle nested lists correctly when merging nested item", () => {
		// Create a document with nested lists
		const initialDocument: Descendant[] = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before list" }],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
							{
								type: "ul_list", // Nested list
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													{
														type: "text",
														text: "Nested item",
													},
												],
											},
										],
									},
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
									{ type: "text", text: "Second item" },
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the beginning of the nested list item
		editor.selection = {
			anchor: { path: [1, 0, 1, 0, 0, 0], offset: 0 },
			focus: { path: [1, 0, 1, 0, 0, 0], offset: 0 },
		};

		const result = handleListMerge(editor);

		// Expected document based on actual behavior
		const expectedDocument = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before list" }],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
							{
								type: "paragraph",
								paddingTop: 0,
								children: [
									{ type: "text", text: "Nested item" },
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
									{ type: "text", text: "Second item" },
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
	it("should merge list items with multiple paragraphs correctly", () => {
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "First item paragraph 1",
									},
								],
							},
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "First item paragraph 2",
									},
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
									{
										type: "text",
										text: "Second item paragraph 1",
									},
								],
							},
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Second item paragraph 2",
									},
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the beginning of the second list item
		editor.selection = {
			anchor: { path: [0, 1, 0, 0], offset: 0 },
			focus: { path: [0, 1, 0, 0], offset: 0 },
		};

		const result = handleListMerge(editor);

		// Expected document after operation - all paragraphs from second item merged into first
		const expectedDocument = [
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "First item paragraph 1",
									},
								],
							},
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "First item paragraph 2",
									},
								],
							},
							{
								type: "paragraph",
								paddingTop: 0,
								children: [
									{
										type: "text",
										text: "Second item paragraph 1",
									},
								],
							},
							{
								type: "paragraph",
								paddingTop: 0,
								children: [
									{
										type: "text",
										text: "Second item paragraph 2",
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

	it("should correctly handle ordered lists with list-item attributes", () => {
		const initialDocument: Descendant[] = [
			{
				type: "ol_list",
				children: [
					{
						type: "list_item",
						listStyleType: "decimal",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
						],
					},
					{
						type: "list_item",
						listStyleType: "decimal",
						customAttribute: "value",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "Second item" },
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the beginning of the second list item
		editor.selection = {
			anchor: { path: [0, 1, 0, 0], offset: 0 },
			focus: { path: [0, 1, 0, 0], offset: 0 },
		};

		const result = handleListMerge(editor);

		// Expected document after operation - custom attributes should be preserved
		const expectedDocument = [
			{
				type: "ol_list",
				children: [
					{
						type: "list_item",
						listStyleType: "decimal",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
							{
								type: "paragraph",
								paddingTop: 0,
								children: [
									{ type: "text", text: "Second item" },
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

	it("should handle merging of list items with empty paragraphs", () => {
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
							{
								type: "paragraph",
								children: [{ type: "text", text: "" }], // Empty paragraph
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [{ type: "text", text: "" }], // Empty paragraph
							},
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Second item content",
									},
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the beginning of the second list item's empty paragraph
		editor.selection = {
			anchor: { path: [0, 1, 0, 0], offset: 0 },
			focus: { path: [0, 1, 0, 0], offset: 0 },
		};

		const result = handleListMerge(editor);

		// Expected document after operation - empty paragraphs should be preserved
		const expectedDocument = [
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "First item" },
								],
							},
							{
								type: "paragraph",
								children: [{ type: "text", text: "" }],
							},
							{
								type: "paragraph",
								paddingTop: 0,
								children: [{ type: "text", text: "" }],
							},
							{
								type: "paragraph",
								paddingTop: 0,
								children: [
									{
										type: "text",
										text: "Second item content",
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

	it("should handle complex document structure with mixed list types", () => {
		const initialDocument: Descendant[] = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before lists" }],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "Bullet list item" },
								],
							},
						],
					},
				],
			},
			{
				type: "ol_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "First numbered item",
									},
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
									{
										type: "text",
										text: "Second numbered item",
									},
								],
							},
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "With formatting",
										bold: true,
									},
								],
							},
						],
					},
				],
			},
		];

		editor.children = initialDocument;

		// Cursor at the beginning of the first numbered item
		editor.selection = {
			anchor: { path: [2, 0, 0, 0], offset: 0 },
			focus: { path: [2, 0, 0, 0], offset: 0 },
		};

		const result = handleListMerge(editor);

		// Expected document after operation
		const expectedDocument = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Before lists" }],
			},
			{
				type: "ul_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "text", text: "Bullet list item" },
								],
							},
						],
					},
				],
			},
			{
				type: "paragraph",
				paddingTop: 0,
				children: [{ type: "text", text: "First numbered item" }],
			},
			{
				type: "ol_list",
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Second numbered item",
									},
								],
							},
							{
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "With formatting",
										bold: true,
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
