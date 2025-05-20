import { ReactEditor } from "slate-react";
import { Editor } from "slate";

export function setEditorFocus(
	editor: Editor,
	selectionContext?: string,
): void {
	if (!editor) {
		throw new Error("Editor is not initialized");
	}

	if (selectionContext === "EditTextUnderPointer") {
		ReactEditor.focus(editor);
	}
}
