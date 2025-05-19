import { createEditor, Transforms, Editor } from "slate";
import { withReact } from "slate-react";
import { applySelectionFontSize } from "./applySelectionFontSize";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

describe("applySelectionFontSize", () => {
	let editor: Editor;

	beforeEach(() => {
		editor = withReact(createEditor());

		// initialize a simple editor structure
		editor.children = [
			{
				type: "paragraph",
				children: [
					{
						fontSize: 14,
						text: "Some text",
					},
				],
			},
		];

		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 9 },
		};
	});

	it("should throw an error if editor is not initialized", () => {
		expect(() => applySelectionFontSize(null as any, 16)).toThrow(
			"Editor is not initialized",
		);
	});

	it("should not apply font size if no marks are selected", () => {
		// Assuming getSelectionMarks returns null if there are no marks
		jest.spyOn(global, "getSelectionMarks").mockReturnValue(null);
		expect(() => applySelectionFontSize(editor, 16)).not.toThrow();
	});

	it("should apply font size to the selected range", () => {
		applySelectionFontSize(editor, 16);
		const marks = Editor.marks(editor);
		expect(marks?.fontSize).toBe(16);
	});

	it("should expand selection to entire document if selection is collapsed", () => {
		editor.selection = {
			anchor: { path: [0, 0], offset: 9 },
			focus: { path: [0, 0], offset: 9 },
		};

		applySelectionFontSize(editor, 16);
		expect(editor.selection).toEqual({
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 9 },
		});
	});

	it('should apply font size "16" to the selected range', () => {
		applySelectionFontSize(editor, 16);
		const marks = Editor.marks(editor);
		expect(marks?.fontSize).toBe(16);
	});

	it('should handle setting font size to "auto" gracefully', () => {
		applySelectionFontSize(editor, "auto");
		const marks = Editor.marks(editor);
		expect(marks?.fontSize).toBe(14);
	});

	it('should not apply any font size if "auto" is not a recognized size', () => {
		applySelectionFontSize(editor, "auto");
		expect(() => applySelectionFontSize(editor, "auto")).not.toThrow();
		const marks = Editor.marks(editor);
		expect(marks?.fontSize).toBe(14);
	});

	it("should leave other text marks unchanged when applying font size", () => {
		Transforms.setNodes(editor, { bold: true }, { at: [0, 0] });

		applySelectionFontSize(editor, 16);
		const marks = Editor.marks(editor);
		expect(marks?.fontSize).toBe(16);
		expect(marks?.bold).toBe(true);
	});

	it("should correctly apply font size with collapsed selection", () => {
		editor.selection = {
			anchor: { path: [0, 0], offset: 4 },
			focus: { path: [0, 0], offset: 4 },
		};

		applySelectionFontSize(editor, 20);
		expect(editor.selection).toEqual({
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 9 },
		});
		const marks = Editor.marks(editor);
		expect(marks?.fontSize).toBe(20);
	});
});
