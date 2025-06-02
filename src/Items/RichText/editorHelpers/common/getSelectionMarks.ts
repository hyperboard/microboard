import { TextNode } from 'Items/RichText/Editor/TextNode';
import { Editor } from 'slate';

export function getSelectionMarks(editor: Editor): Omit<TextNode, 'text'> | null {
	return Editor.marks(editor);
}
