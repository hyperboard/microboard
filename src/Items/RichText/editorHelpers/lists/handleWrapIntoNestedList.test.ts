import { createEditor, Descendant } from "slate";
import { withReact } from "slate-react";
import { handleWrapIntoNestedList } from "./handleWrapIntoNestedList";
import { CustomEditor } from "../../Editor/Editor";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { TextNode } from "../../Editor/TextNode";
import {
	ParagraphNode,
	ListItemNode,
	BulletedListNode,
	NumberedListNode,
} from "../../Editor/BlockNode";

// Define the extended editor type for tests
type TestEditor = CustomEditor & {
	createParagraphNode: (text: string) => ParagraphNode;
};

describe("handleWrapIntoNestedList", () => {
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
		global.structuredClone =
			global.structuredClone || (obj => JSON.parse(JSON.stringify(obj)));

		editor.createParagraphNode = (text: string) => ({
			type: "paragraph",
			children: [createTextNode(text)],
		});
	});

	it("should return false if there is no selection", () => {
		editor.selection = null;
		expect(handleWrapIntoNestedList(editor)).toBe(false);
	});

	it("should not wrap into nested list if cursor is not at the start of the first child", () => {
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("List item")],
							} as ParagraphNode,
						],
					} as ListItemNode,
				],
			} as BulletedListNode,
		];

		editor.children = initialDocument;
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 5 },
			focus: { path: [0, 0, 0, 0], offset: 5 },
		};

		expect(handleWrapIntoNestedList(editor)).toBe(false);
		expect(editor.children).toEqual(initialDocument);
	});

	it("should wrap paragraph into a nested list if cursor is at the start of the paragraph", () => {
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("List item")],
							} as ParagraphNode,
						],
					} as ListItemNode,
				],
			} as BulletedListNode,
		];

		editor.children = initialDocument;
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 0], offset: 0 },
		};

		const result = handleWrapIntoNestedList(editor);
		expect(result).toBe(true);

		const expectedDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "ul_list",
								listLevel: 2,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode("List item"),
												],
											} as ParagraphNode,
										],
									} as ListItemNode,
								],
							} as BulletedListNode,
						],
					} as ListItemNode,
				],
			} as BulletedListNode,
		];

		expect(editor.children).toEqual(expectedDocument);
	});

	it("should return false if current node is not a list item", () => {
		const initialDocument: Descendant[] = [
			{
				type: "paragraph",
				children: [createTextNode("Paragraph")],
			} as ParagraphNode,
		];

		editor.children = initialDocument;
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		expect(handleWrapIntoNestedList(editor)).toBe(false);
		expect(editor.children).toEqual(initialDocument);
	});

	it("should correctly handle an empty paragraph in a list", () => {
		const initialDocument: Descendant[] = [
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
							} as ParagraphNode,
						],
					} as ListItemNode,
				],
			} as NumberedListNode,
		];

		editor.children = initialDocument;
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 0], offset: 0 },
		};

		const result = handleWrapIntoNestedList(editor);
		expect(result).toBe(true);

		const expectedDocument: Descendant[] = [
			{
				type: "ol_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "ol_list",
								listLevel: 2,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [createTextNode("")],
											} as ParagraphNode,
										],
									} as ListItemNode,
								],
							} as NumberedListNode,
						],
					} as ListItemNode,
				],
			} as NumberedListNode,
		];

		expect(editor.children).toEqual(expectedDocument);
	});

	it("should wrap into a nested list when nested list already exists", () => {
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "ul_list",
								listLevel: 2,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode("Nested"),
												],
											} as ParagraphNode,
										],
									} as ListItemNode,
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode(
														"Another nested",
													),
												],
											} as ParagraphNode,
										],
									} as ListItemNode,
								],
							} as BulletedListNode,
						],
					} as ListItemNode,
				],
			} as BulletedListNode,
		];

		editor.children = initialDocument;
		editor.selection = {
			anchor: { path: [0, 0, 0, 1, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0, 1, 0, 0], offset: 0 },
		};

		const result = handleWrapIntoNestedList(editor);
		expect(result).toBe(true);

		const expectedDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "ul_list",
								listLevel: 2,
								children: [
									{
										type: "list_item",
										children: [
											{
												type: "paragraph",
												children: [
													createTextNode("Nested"),
												],
											} as ParagraphNode,
										],
									} as ListItemNode,
									{
										type: "list_item",
										children: [
											{
												type: "ul_list",
												listLevel: 3,
												children: [
													{
														type: "list_item",
														children: [
															{
																type: "paragraph",
																children: [
																	createTextNode(
																		"Another nested",
																	),
																],
															} as ParagraphNode,
														],
													} as ListItemNode,
												],
											} as BulletedListNode,
										],
									} as ListItemNode,
								],
							} as BulletedListNode,
						],
					} as ListItemNode,
				],
			} as BulletedListNode,
		];

		expect(editor.children).toEqual(expectedDocument);
	});

	it("should not modify structure if cursor is not at the start of a valid paragraph", () => {
		const initialDocument: Descendant[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								children: [createTextNode("List item")],
							} as ParagraphNode,
						],
					} as ListItemNode,
				],
			} as BulletedListNode,
		];

		editor.children = initialDocument;
		editor.selection = {
			anchor: { path: [0, 0, 0, 0], offset: 5 },
			focus: { path: [0, 0, 0, 0], offset: 5 },
		};

		const result = handleWrapIntoNestedList(editor);
		expect(result).toBe(false);
		expect(editor.children).toEqual(initialDocument);
	});
});
