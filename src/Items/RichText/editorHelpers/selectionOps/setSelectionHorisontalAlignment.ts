import { HorisontalAlignment } from 'Items/Alignment';
import { Editor, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';

export function setSelectionHorisontalAlignment(
	editor: Editor,
	horisontalAlignment: HorisontalAlignment,
	selectionContext?: string
): void {
	if (!editor) {
		throw new Error('Editor is not initialized');
	}

	const { selection } = editor;
	if (!selection) {
		throw new Error('Nothing is selected');
	}

	// const [match] = Editor.nodes(editor, {
	// 	at: Editor.unhangRange(editor, selection),
	// 	match: node => {
	// 		return (
	// 			!Editor.isEditor(node) &&
	// 			Element.isElement(node) &&
	// 			node.horisontalAlignment === horisontalAlignment
	// 		);
	// 	},
	// });

	if (selectionContext === 'EditTextUnderPointer') {
		ReactEditor.focus(editor);
	}

	Transforms.setNodes(editor, {
		horisontalAlignment: horisontalAlignment,
	});
}
