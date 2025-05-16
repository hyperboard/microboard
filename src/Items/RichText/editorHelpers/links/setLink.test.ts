import { createEditor, Editor, Transforms } from "slate";
import { withReact } from "slate-react";
import { setLink } from "./setLink";
import { CustomEditor } from "../../Editor/Editor";
import { describe, it, expect, beforeEach } from "@jest/globals";

type TestEditor = CustomEditor;

describe("setLink", () => {
	let editor: TestEditor;

	beforeEach(() => {
		editor = withReact(createEditor()) as TestEditor;
		editor.children = [
			{
				type: "paragraph",
				children: [
					{
						type: "text",
						text: "Test paragraph with a link",
						link: undefined,
					},
				],
			},
		];

		// Ensure selection starts at paragraph start for test simplicity
		Transforms.select(editor, {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 20 },
		});
	});

	it("should apply link to selected text", () => {
		Transforms.select(editor, {
			anchor: { path: [0, 0], offset: 5 },
			focus: { path: [0, 0], offset: 20 },
		});
		const link = "http://example.com";
		setLink(editor, link, editor.selection);

		const [node1] = Editor.node(editor, [0, 0]);
		const [node2] = Editor.node(editor, [0, 1]);
		expect(node1.link).toBeUndefined();
		expect(node2.link).toBe(link);
	});

	it("should apply link to selected nodes and change color", () => {
		const defaultColor = "rgb(20, 21, 26)";
		editor.children = [
			{
				type: "paragraph",
				children: [
					{
						type: "text",
						text: "Start",
						link: undefined,
						fontColor: defaultColor,
						bold: true,
					},
					{
						type: "text",
						text: "Test paragraph with a link",
						link: undefined,
						fontColor: defaultColor,
						underline: true,
					},
					{
						type: "text",
						text: "End",
						link: undefined,
						fontColor: defaultColor,
						fontHighlight: defaultColor,
					},
				],
			},
		];
		Transforms.select(editor, {
			anchor: { path: [0, 0], offset: 2 },
			focus: { path: [0, 2], offset: 2 },
		});
		const link = "http://example.com";
		const expectedColor = "rgba(71, 120, 245, 1)";
		setLink(editor, link, editor.selection);

		const expectedDocument = [
			{
				type: "paragraph",
				children: [
					{
						type: "text",
						text: "St",
						link: undefined,
						fontColor: defaultColor,
						bold: true,
					},
					{
						type: "text",
						text: "art",
						link,
						fontColor: expectedColor,
						bold: true,
					},
					{
						type: "text",
						text: "Test paragraph with a link",
						link,
						fontColor: expectedColor,
						underline: true,
					},
					{
						type: "text",
						text: "En",
						link,
						fontColor: expectedColor,
						fontHighlight: defaultColor,
					},
					{
						type: "text",
						text: "d",
						link: undefined,
						fontColor: defaultColor,
						fontHighlight: defaultColor,
					},
				],
			},
		];
		expect(editor.children).toEqual(expectedDocument);
	});

	it("should remove link if no URL is provided", () => {
		setLink(editor, undefined, editor.selection);

		const [node] = Editor.node(editor, [0, 0]);
		expect(node.link).toBeUndefined();
	});

	it("should select the whole text if no selection is provided", () => {
		Transforms.select(editor, {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 31 },
		});

		setLink(editor, "http://example.com", null);
		const [node] = Editor.node(editor, [0, 0]);
		expect(node.link).toBe("http://example.com");
	});

	it("should set link to the whole text when the selection is invalid", () => {
		Transforms.deselect(editor); // Ensure there's no selection

		setLink(editor, "http://example.com", null);
		const [node] = Editor.node(editor, [0, 0]);
		expect(node.link).toBe("http://example.com");
	});
});
