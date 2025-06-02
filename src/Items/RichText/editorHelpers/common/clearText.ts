import { Editor, Transforms } from 'slate';
import { selectWholeText } from 'Items/RichText/editorHelpers/common/selectWholeText';

export function clearText(editor: Editor): void {
	Transforms.select(editor, {
		anchor: Editor.start(editor, []),
		focus: Editor.end(editor, []),
	});
	selectWholeText(editor);
	Transforms.delete(editor);
}
