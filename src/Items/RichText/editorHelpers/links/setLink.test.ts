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
				children: [{ text: "Test paragraph with a link" }],
			},
		];

		// Ensure selection starts at paragraph start for test simplicity
		Transforms.select(editor, {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 20 },
		});
	});

	it("should apply link to selected text", () => {
		const link = "http://example.com";
		setLink(editor, link, editor.selection);

		const [node] = Editor.node(editor, [0, 0]);
		expect(node.link).toBe(link);
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

	it("should not modify the text when the selection is invalid", () => {
		Transforms.deselect(editor); // Ensure there's no selection
		const initialText = editor.children;

		setLink(editor, "http://example.com", null);
		expect(editor.children).toEqual(initialText); // No changes should have occurred
	});
});
