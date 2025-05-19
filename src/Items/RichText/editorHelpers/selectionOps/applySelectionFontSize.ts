import { Editor, Transforms } from "slate";
import { getSelectionMarks } from "Board/Items/RichText/editorHelpers/common/getSelectionMarks";

export function applySelectionFontSize(
	editor: Editor,
	fontSize: number,
	selectionContext?: string,
): void {
	const size = fontSize;
	if (typeof size !== "number") {
		return;
	}
	if (!editor) {
		throw new Error("Editor is not initialized");
	}
	const selection = editor.selection;

	const marks = getSelectionMarks(editor);
	if (!marks) {
		return;
	}

	if (
		JSON.stringify(selection?.anchor) === JSON.stringify(selection?.focus)
	) {
		Transforms.select(editor, {
			anchor: Editor.start(editor, []),
			focus: Editor.end(editor, []),
		});
	}
	Editor.addMark(editor, "fontSize", size);

	if (selectionContext === "EditTextUnderPointer") {
		// ReactEditor.focus(editor);
	}
}
