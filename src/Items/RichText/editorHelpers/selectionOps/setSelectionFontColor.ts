import { Editor } from 'slate';
import { ReactEditor } from 'slate-react';
import { getSelectionMarks } from 'Items/RichText/editorHelpers/common/getSelectionMarks';
import type { ColorValue } from 'Color';

export function setSelectionFontColor(
	editor: Editor,
	format: string | ColorValue,
	selectionContext?: string
): void {
	const marks = getSelectionMarks(editor);
	if (!marks) {
		return;
	}

	if (marks.fontColor !== format) {
		Editor.addMark(editor, 'fontColor', format);
	}

	if (selectionContext === 'EditTextUnderPointer') {
		try {
			ReactEditor.focus(editor);
		} catch (er) {
			console.warn(er);
		}
	}
}
