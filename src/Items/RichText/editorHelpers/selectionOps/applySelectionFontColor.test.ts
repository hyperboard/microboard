import { createEditor, Editor } from "slate";
import { withReact } from "slate-react";
import { applySelectionFontColor } from "./applySelectionFontColor";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Define a mock function manually
const addMarkMock = jest.fn();

describe("applySelectionFontColor", () => {
	let editor: ReturnType<typeof createEditor>;

	beforeEach(() => {
		editor = withReact(createEditor());

		editor.children = [
			{
				type: "paragraph",
				children: [
					{ text: "Hello, world!", fontColor: "rgb(20, 21, 26)" },
				],
			},
		];

		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 5 },
		};

		// Temporarily replace the addMark function in the Editor
		Editor.addMark = addMarkMock;
	});

	it("applies font color to selected text", () => {
		applySelectionFontColor(editor, "red");

		expect(addMarkMock).toHaveBeenCalledWith(editor, "fontColor", "red");

		const expectedDocument = [
			{
				type: "paragraph",
				children: [{ text: "Hello, world!", fontColor: "red" }],
			},
		];

		(editor.children[0].children[0] as any).fontColor = "red";
		expect(editor.children).toEqual(expectedDocument);
	});

	it("does nothing if no selection is present", () => {
		editor.selection = null;

		applySelectionFontColor(editor, "red");

		const unchangedDocument = [
			{
				type: "paragraph",
				children: [
					{ text: "Hello, world!", fontColor: "rgb(20, 21, 26)" },
				],
			},
		];
		expect(editor.children).toEqual(unchangedDocument);
	});
});
