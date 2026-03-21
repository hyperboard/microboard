import { BlockType } from 'Items/RichText/Editor/BlockNode';
import { Editor, Element } from 'slate';

export function isBlockActive(editor: Editor, format: BlockType): boolean {
	const { selection } = editor;
	if (!selection) {
		return false;
	}
	const [match] = Editor.nodes(editor, {
		at: Editor.unhangRange(editor, selection),
		match: node => {
			return !Editor.isEditor(node) && Element.isElement(node) && (node as any).type === format;
		},
	});
	return !!match;
}
