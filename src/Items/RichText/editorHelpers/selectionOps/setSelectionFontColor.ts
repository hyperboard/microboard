import { Editor, Node, Range, Text, Transforms } from 'slate';
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
		if (editor.selection && Range.isExpanded(editor.selection)) {
			(Transforms.setNodes as any)(
				editor,
					{ fontColor: format },
					{
						match: (n: Node) => Text.isText(n),
						split: true,
					}
			);
		} else {
			Editor.addMark(editor, 'fontColor', format);
		}
	}

	if (selectionContext === 'EditTextUnderPointer') {
		try {
			ReactEditor.focus(editor);
		} catch (er) {
			console.warn(er);
		}
	}
}
