import { ParagraphNode } from 'Items/RichText/Editor/BlockNode';
import { Editor } from 'slate';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import { HorisontalAlignment } from 'Items/Alignment';

export function createParagraphNode(
	text: string,
	editor: CustomEditor,
	horisontalAlignment?: HorisontalAlignment
): ParagraphNode {
	const marks = Editor.marks(editor) || {};
	const pargaraph: ParagraphNode = {
		type: 'paragraph',
		children: [{ type: 'text', text, ...marks }],
	};
	if (horisontalAlignment) {
		pargaraph.horisontalAlignment = horisontalAlignment;
	}
	return pargaraph;
}
