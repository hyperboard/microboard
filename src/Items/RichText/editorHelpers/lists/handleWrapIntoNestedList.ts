import { Editor, Path, Transforms, Text, Element } from 'slate';
import { isCursorAtStartOfFirstChild } from 'Items/RichText/editorHelpers/common/isCursorAtStartOfFirstChild';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import {BlockNode, BulletedListNode, NumberedListNode} from "../../Editor/BlockNode";

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
		!Text.isText(textNode) ||
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
	if (
		!listItem || 
		Editor.isEditor(listItem) || 
		!Element.isElement(listItem) || 
		(listItem as unknown as BlockNode).type !== 'list_item'
	) {
		return false;
	}

	const listPath = Path.parent(listItemPath);
	const [list] = Editor.node(editor, listPath);
	if (
		!list || 
		Editor.isEditor(list) || 
		!Element.isElement(list) || 
		((list as unknown as BlockNode).type !== 'ol_list' && (list as unknown as BlockNode).type !== 'ul_list')
	) {
		return false;
	}
	const listElement = list as unknown as (BulletedListNode | NumberedListNode);

	Transforms.wrapNodes(editor, { type: 'list_item', children: [] } as BlockNode, { at: paragraphPath });

	Transforms.wrapNodes(
		editor,
		{
			type: listElement.type,
			listLevel: (listElement.listLevel || 1) + 1,
			children: [],
		} as BlockNode,
		{ at: paragraphPath }
	);

	return true;
}
