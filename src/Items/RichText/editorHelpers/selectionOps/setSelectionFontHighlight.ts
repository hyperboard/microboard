import { Editor } from "slate";
import { ReactEditor } from "slate-react";
import { getSelectionMarks } from "Board/Items/RichText/editorHelpers/common/getSelectionMarks";

export function setSelectionFontHighlight(
	editor: Editor,
	format: string,
	selectionContext?: string,
): void {
	if (!editor) {
		throw new Error("Editor is not initialized");
	}
	const marks = getSelectionMarks(editor);
	if (!marks) {
		return;
	}

	if (format === "none") {
		Editor.removeMark(editor, "fontHighlight");
	} else if (marks.fontHighlight === format) {
		Editor.removeMark(editor, "fontHighlight");
	} else {
		Editor.addMark(editor, "fontHighlight", format);
	}

	if (selectionContext === "EditTextUnderPointer") {
		ReactEditor.focus(editor);
	}
}
