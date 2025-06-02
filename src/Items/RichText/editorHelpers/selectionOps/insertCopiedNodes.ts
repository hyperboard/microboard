import { BlockNode } from 'Items/RichText/Editor/BlockNode';
import { Editor, Transforms } from 'slate';
import { isTextEmpty } from 'Items/RichText/editorHelpers/common/isTextEmpty';
import { selectWholeText } from 'Items/RichText/editorHelpers/common/selectWholeText';
import { moveCursorToEndOfTheText } from 'Items/RichText/editorHelpers/common/moveCursorToEndOfText';

export function insertCopiedNodes(editor: Editor, nodes: BlockNode[]): boolean {
	const isPrevTextEmpty = isTextEmpty(editor.children);

	if (isPrevTextEmpty) {
		selectWholeText(editor);
		Transforms.removeNodes(editor);
		Transforms.insertNodes(editor, nodes);
		moveCursorToEndOfTheText(editor);
		return true;
	}

	if (
		nodes.length === 1 &&
		nodes[0].type === 'paragraph' &&
		nodes[0].children.length === 1 &&
		nodes[0].children[0].type === 'text'
	) {
		Transforms.insertText(editor, nodes[0].children[0].text);
		Transforms.collapse(editor, { edge: 'end' });
		return true;
	}

	Transforms.insertNodes(editor, nodes);
	Transforms.collapse(editor, { edge: 'end' });

	return true;
}
