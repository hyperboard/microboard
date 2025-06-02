import { ListType } from 'Items/RichText/Editor/BlockNode';
import { Editor, Element, Range } from 'slate';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import { selectWholeText } from 'Items/RichText/editorHelpers/common/selectWholeText';

export function getListTypeAtSelectionStart(editor: CustomEditor): ListType | null {
	const { selection } = editor;

	if (!selection) {
		selectWholeText(editor);
	}

	if (!selection) {
		return null;
	}

	const startPoint = Range.start(selection);

	const listEntry = Editor.above<Element>(editor, {
		at: startPoint,
		match: n => n.type === 'ol_list' || n.type === 'ul_list',
	});

	if (listEntry) {
		const [listNode] = listEntry;
		return listNode.type as ListType;
	}

	return null;
}
