import { Editor, Transforms, createEditor } from "slate";
import { withReact } from "slate-react";
import { setSelectionFontSize } from "./setSelectionFontSize";
import { withHistory } from "slate-history";
import { ReactEditor } from "slate-react";
import { createParagraphNode } from "Board/Items/RichText/editorHelpers/common/createParagraphNode";
import { getSelectionMarks } from "Board/Items/RichText/editorHelpers/common/getSelectionMarks";
import { selectWholeText } from "Board/Items/RichText/editorHelpers/common/selectWholeText";

describe("setSelectionFontSize", () => {
	let editor: Editor;

	beforeEach(() => {
		const baseEditor = createEditor();
		editor = withHistory(withReact(baseEditor));
		// Initialize Slate editor with empty paragraph
		editor.children = [createParagraphNode("", editor)];
		jest.clearAllMocks();
	});

	it("throws error when editor is not initialized", () => {
		expect(() =>
			setSelectionFontSize(null as unknown as Editor, false, 14),
		).toThrow("Editor is not initialized");
	});

	it("throws error when cannot get selection marks", () => {
		editor.selection = null;
		expect(() => setSelectionFontSize(editor, false, 14)).toThrow(
			"Editor can not get selection marks",
		);
	});

	it("expands collapsed selection to full document", () => {
		editor.children = [{ type: "paragraph", children: [{ text: "Test" }] }];
		editor.selection = {
			anchor: { path: [0, 0], offset: 2 },
			focus: { path: [0, 0], offset: 2 },
		};

		setSelectionFontSize(editor, false, 16);

		expect(editor.selection).toEqual({
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 4 },
		});
	});

	it("sets font size for non-empty text", () => {
		editor.children = [{ type: "paragraph", children: [{ text: "Test" }] }];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 4 },
		};

		setSelectionFontSize(editor, false, 16);

		expect(getSelectionMarks(editor)).toEqual({ fontSize: 16 });
	});

	it("handles auto size with base 14", () => {
		editor.children = [{ type: "paragraph", children: [{ text: "Test" }] }];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 4 },
		};

		setSelectionFontSize(editor, true, 14);

		expect(getSelectionMarks(editor)).toEqual({ fontSize: 1 });
	});

	it("creates new text node with font size when editor is empty", () => {
		editor.children = [
			{
				type: "paragraph",
				children: [{ type: "text", text: "", fontSize: 14 }],
			},
		];
		selectWholeText(editor);

		const result = setSelectionFontSize(editor, false, 18);

		expect(result).toBe(false);
		expect(editor.children[0].children[0].fontSize).toBe(18);
	});

	it("does not change empty editor when size is auto", () => {
		editor.children = [{ type: "paragraph", children: [{ text: "" }] }];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		const result = setSelectionFontSize(editor, true, "auto");

		expect(result).toBe(false);
		expect(editor.children[0].children[0].fontSize).toBeUndefined();
	});

	it("handles multiple paragraphs selection", () => {
		editor.children = [
			{ type: "paragraph", children: [{ text: "First" }] },
			{ type: "paragraph", children: [{ text: "Second" }] },
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [1, 0], offset: 6 },
		};

		setSelectionFontSize(editor, false, 20);

		expect(getSelectionMarks(editor)).toEqual({ fontSize: 20 });
	});

	it("returns false when not creating new text node", () => {
		editor.children = [{ type: "paragraph", children: [{ text: "Test" }] }];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 4 },
		};

		const result = setSelectionFontSize(editor, false, 16);

		expect(result).toBe(false);
	});
});
