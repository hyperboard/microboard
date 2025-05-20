import { Editor, createEditor, Transforms } from "slate";
import { withReact } from "slate-react";
import { setSelectionHorisontalAlignment } from "./setSelectionHorisontalAlignment";
import { ReactEditor } from "slate-react";

describe("setSelectionHorisontalAlignment", () => {
	let editor: Editor;

	beforeEach(() => {
		editor = withReact(createEditor());
		editor.children = [
			{
				type: "paragraph",
				children: [{ text: "Test paragraph" }],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 13 },
		};
		jest.clearAllMocks();
	});

	it("throws error when editor is not initialized", () => {
		expect(() =>
			setSelectionHorisontalAlignment(null as unknown as Editor, "left"),
		).toThrow("Editor is not initialized");
	});

	it("throws error when nothing is selected", () => {
		editor.selection = null;
		expect(() => setSelectionHorisontalAlignment(editor, "left")).toThrow(
			"Nothing is selected",
		);
	});

	it("sets left alignment correctly", () => {
		setSelectionHorisontalAlignment(editor, "left");

		expect(editor.children).toEqual([
			{
				type: "paragraph",
				horisontalAlignment: "left",
				children: [{ text: "Test paragraph" }],
			},
		]);
	});

	it("sets center alignment correctly", () => {
		setSelectionHorisontalAlignment(editor, "center");

		expect(editor.children).toEqual([
			{
				type: "paragraph",
				horisontalAlignment: "center",
				children: [{ text: "Test paragraph" }],
			},
		]);
	});

	it("sets right alignment correctly", () => {
		setSelectionHorisontalAlignment(editor, "right");

		expect(editor.children).toEqual([
			{
				type: "paragraph",
				horisontalAlignment: "right",
				children: [{ text: "Test paragraph" }],
			},
		]);
	});

	it("handles multiple paragraphs selection", () => {
		editor.children = [
			{
				type: "paragraph",
				children: [{ text: "First paragraph" }],
			},
			{
				type: "paragraph",
				children: [{ text: "Second paragraph" }],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [1, 0], offset: 15 },
		};

		setSelectionHorisontalAlignment(editor, "center");

		expect(editor.children).toEqual([
			{
				type: "paragraph",
				horisontalAlignment: "center",
				children: [{ text: "First paragraph" }],
			},
			{
				type: "paragraph",
				horisontalAlignment: "center",
				children: [{ text: "Second paragraph" }],
			},
		]);
	});

	it("overrides existing alignment", () => {
		editor.children = [
			{
				type: "paragraph",
				horisontalAlignment: "right",
				children: [{ text: "Test paragraph" }],
			},
		];

		setSelectionHorisontalAlignment(editor, "left");

		expect(editor.children).toEqual([
			{
				type: "paragraph",
				horisontalAlignment: "left",
				children: [{ text: "Test paragraph" }],
			},
		]);
	});
});
