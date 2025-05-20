import { Editor, createEditor } from "slate";
import { ReactEditor, withReact } from "slate-react";
import { setSelectionFontColor } from "./setSelectionFontColor";
import { withHistory } from "slate-history";
import { createParagraphNode } from "Board/Items/RichText/editorHelpers/common/createParagraphNode";
import { selectWholeText } from "Board/Items/RichText/editorHelpers/common/selectWholeText";
import { getSelectionMarks } from "Board/Items/RichText/editorHelpers/common/getSelectionMarks";

describe("setSelectionFontColor", () => {
	let editor: Editor;

	beforeEach(() => {
		const baseEditor = createEditor();
		editor = withHistory(withReact(baseEditor));
		// Initialize Slate editor with empty paragraph
		editor.children = [createParagraphNode("", editor)];
	});

	it("sets font color when no color is applied", () => {
		editor.children = [
			{ type: "paragraph", children: [{ text: "Test text" }] },
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 9 },
		};

		setSelectionFontColor(editor, "red");

		expect(getSelectionMarks(editor)).toEqual({ fontColor: "red" });
	});

	it("changes existing font color", () => {
		editor.children = [
			{
				type: "paragraph",
				children: [{ text: "Colored text", fontColor: "blue" }],
			},
		];
		selectWholeText(editor);

		setSelectionFontColor(editor, "green");

		expect(getSelectionMarks(editor)).toEqual({ fontColor: "green" });
	});

	it("does nothing when setting same color", () => {
		editor.children = [
			{
				type: "paragraph",
				children: [{ text: "Colored text", fontColor: "blue" }],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 12 },
		};

		const originalMarks = { ...getSelectionMarks(editor) };
		setSelectionFontColor(editor, "blue");

		expect(getSelectionMarks(editor)).toEqual(originalMarks);
	});

	it("handles partial selection with different colors", () => {
		editor.children = [
			{
				type: "paragraph",
				children: [
					{ text: "Red ", fontColor: "red" },
					{ text: "Blue", fontColor: "blue" },
				],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 2 },
			focus: { path: [0, 1], offset: 2 },
		};

		setSelectionFontColor(editor, "green");

		expect(editor.children).toEqual([
			{
				type: "paragraph",
				children: [
					{ text: "Re", fontColor: "red" },
					{ text: "d Bl", fontColor: "green" },
					{ text: "ue", fontColor: "blue" },
				],
			},
		]);
	});

	it("focuses editor when selectionContext is EditTextUnderPointer", () => {
		editor.children = [{ type: "paragraph", children: [{ text: "Test" }] }];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 4 },
		};

		const mockFocus = jest.fn();
		jest.spyOn(ReactEditor, "focus").mockImplementation(mockFocus);

		setSelectionFontColor(editor, "purple", "EditTextUnderPointer");

		expect(mockFocus).toHaveBeenCalled();
	});

	it("does not throw when selection is null", () => {
		editor.children = [{ type: "paragraph", children: [{ text: "Test" }] }];
		editor.selection = null;

		expect(() => {
			setSelectionFontColor(editor, "black");
		}).not.toThrow();
	});
});
