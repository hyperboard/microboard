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
		(textNode as any).type !== 'text' ||
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
	if (!listItem || Editor.isEditor(listItem) || (listItem as any).type !== 'list_item') {
		return false;
	}

	const listPath = Path.parent(listItemPath);
	const [list] = Editor.node(editor, listPath);
	if (!list || Editor.isEditor(list) || ((list as any).type !== 'ol_list' && (list as any).type !== 'ul_list')) {
		return false;
	}

	Transforms.wrapNodes(editor, { type: 'list_item', children: [] } as any, { at: paragraphPath });

	Transforms.wrapNodes(
		editor,
		{
			type: (list as any).type,
			listLevel: ((list as any).listLevel || 1) + 1,
			children: [],
		} as any,
		{ at: paragraphPath }
	);

	return true;
}
