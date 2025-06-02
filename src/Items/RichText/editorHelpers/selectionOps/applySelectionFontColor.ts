import { Editor } from 'slate';
import { getSelectionMarks } from 'Items/RichText/editorHelpers/common/getSelectionMarks';

export function applySelectionFontColor(editor: Editor, fontColor: string): void {
	if (!editor) {
		throw new Error('Editor is not initialized');
	}

	const marks = getSelectionMarks(editor);
	if (!marks) {
		return;
	}
	Editor.addMark(editor, 'fontColor', fontColor);
}
