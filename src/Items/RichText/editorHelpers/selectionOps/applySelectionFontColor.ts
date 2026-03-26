import { Editor, Range, Text, Transforms } from 'slate';
import { getSelectionMarks } from 'Items/RichText/editorHelpers/common/getSelectionMarks';
import type { ColorValue } from 'Color';

export function applySelectionFontColor(editor: Editor, fontColor: string | ColorValue): void {
	if (!editor) {
		throw new Error('Editor is not initialized');
	}

	const marks = getSelectionMarks(editor);
	if (!marks) {
		return;
	}
	if (editor.selection && Range.isExpanded(editor.selection)) {
		(Transforms.setNodes as any)(
			editor,
			{ fontColor },
			{
				match: n => Text.isText(n),
				split: true,
			}
		);
	} else {
		Editor.addMark(editor, 'fontColor', fontColor);
	}
}
