import { Editor, Path, Transforms } from 'slate';
import { isCursorAtStartOfFirstChild } from 'Items/RichText/editorHelpers/common/isCursorAtStartOfFirstChild';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';

export function handleWrapIntoNestedList(editor: CustomEditor): boolean {
	const { selection } = editor;

	if (!selection) {
		return false;
	}

	const { anchor } = selection;
	const [textNode, textNodePath] = Editor.node(editor, anchor.path);
	if (
		!textNode ||
		Editor.isEditor(textNode) ||
		textNode.type !== 'text' ||
		!("text" in textNode) ||
		!isCursorAtStartOfFirstChild(editor, textNodePath)
	) {
		return false;
	}

	const paragraphPath = Path.parent(textNodePath);
	const [paragraph] = Editor.node(editor, paragraphPath);
	if (!paragraph || !isCursorAtStartOfFirstChild(editor, paragraphPath)) {
		return false;
	}

	const listItemPath = Path.parent(paragraphPath);
	const [listItem] = Editor.node(editor, listItemPath);
	if (!listItem || Editor.isEditor(listItem) || listItem.type !== 'list_item') {
		return false;
	}

	const listPath = Path.parent(listItemPath);
	const [list] = Editor.node(editor, listPath);
	if (!list || Editor.isEditor(list) || (list.type !== 'ol_list' && list.type !== 'ul_list')) {
		return false;
	}

	Transforms.wrapNodes(editor, { type: 'list_item', children: [] }, { at: paragraphPath });

	Transforms.wrapNodes(
		editor,
		{
			type: list.type,
			listLevel: (list.listLevel || 1) + 1,
			children: [],
		},
		{ at: paragraphPath }
	);

	return true;
}
