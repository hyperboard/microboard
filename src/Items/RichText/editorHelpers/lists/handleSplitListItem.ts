import { Descendant, Editor, Element, Node, Path, Range, Transforms, Text } from 'slate';
import { getAreAllChildrenEmpty } from 'Items/RichText/editorHelpers/common/getAreAllChildrenEmpty';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import { createParagraphNode } from 'Items/RichText/editorHelpers/common/createParagraphNode';
import {BlockNode, ListItemNode, BulletedListNode, NumberedListNode} from "../../Editor/BlockNode";
import {TextNode} from "../../Editor/TextNode";

export function handleSplitListItem(editor: CustomEditor): boolean {
	if (!editor.selection || !Range.isCollapsed(editor.selection)) {
		return false;
	}

	const { anchor } = editor.selection;

	const textNodeEntry = Editor.node(editor, anchor.path);
	if (!textNodeEntry) {
		return false;
	}
	const [textNode, textNodePath] = textNodeEntry;
	if (!Node.isNode(textNode) || Editor.isEditor(textNode) || !Text.isText(textNode)) {
		return false;
	}

	const paragraphPath = Path.parent(textNodePath);
	const paragraphEntry = Editor.node(editor, paragraphPath);
	if (!paragraphEntry) {
		return false;
	}
	const [paragraphNode] = paragraphEntry;
	if (!Element.isElement(paragraphNode) || !Editor.isBlock(editor, paragraphNode)) {
		return false;
	}

	const listItemPath = Path.parent(paragraphPath);
	const listItemEntry = Editor.node(editor, listItemPath);
	if (!listItemEntry) {
		return false;
	}
	const [listItemNode] = listItemEntry;
	if (!Element.isElement(listItemNode) || (listItemNode as unknown as BlockNode).type !== 'list_item') {
		return false;
	}
	const listItem = listItemNode as unknown as ListItemNode;

	const listPath = Path.parent(listItemPath);
	const listEntry = Editor.node(editor, listPath);
	if (!listEntry) {
		return false;
	}
	const [listNode] = listEntry;
	if (
		!Element.isElement(listNode) ||
		((listNode as unknown as BlockNode).type !== 'ol_list' && (listNode as unknown as BlockNode).type !== 'ul_list')
	) {
		return false;
	}
	const list = listNode as unknown as (BulletedListNode | NumberedListNode);

	const isBlockEmpty = (textNode as unknown as TextNode).text === '';
	const isOnlyChildParagraph = listItem.children.length === 1;

	if (isBlockEmpty && isOnlyChildParagraph) {
		const listItemIndex = listItemPath[listItemPath.length - 1];
		const [parentList, parentListPath] = Editor.parent(editor, listItemPath);
		if (Editor.isEditor(parentList) || !Element.isElement(parentList) || ((parentList as unknown as BlockNode).type !== "ol_list" && (parentList as unknown as BlockNode).type !== "ul_list")) {
			return false;
		}
		const parentListElement = parentList as unknown as (BulletedListNode | NumberedListNode);
		const listType = parentListElement.type;

		Editor.withoutNormalizing(editor, () => {
			const nextPath = Path.next(parentListPath);
			Transforms.insertNodes(
				editor,
				{
					...createParagraphNode('', editor),
					paddingTop: 0.5,
				},
				{ at: nextPath }
			);

			if (parentListElement.children.length > listItemIndex + 1) {
				const newListPath = Path.next(nextPath);
				const itemsAfter = parentListElement.children.slice(listItemIndex + 1);

				Transforms.insertNodes(
					editor,
					{
						type: listType,
						listLevel: list.listLevel || 0,
						children: itemsAfter.map(item => ({
							type: 'list_item',
							children: item.children,
						})),
					} as BlockNode,
					{ at: newListPath }
				);
			}

			Transforms.removeNodes(editor, {
				at: parentListPath,
				match: (n, path) => path[path.length - 1] >= listItemIndex,
			});

			const [updatedParentList] = Editor.node(editor, parentListPath);
			if (Editor.isEditor(updatedParentList) || !Element.isElement(updatedParentList)) {
				return false;
			}
			if (getAreAllChildrenEmpty(updatedParentList as unknown as ListItemNode)) {
				Transforms.removeNodes(editor, { at: parentListPath });
			}

			Transforms.select(editor, {
				anchor: { path: [...nextPath, 0], offset: 0 },
				focus: { path: [...nextPath, 0], offset: 0 },
			});
		});

		return true;
	}

	Transforms.splitNodes(editor, {
		at: editor.selection.anchor,
		match: n => Element.isElement(n) && (n as unknown as BlockNode).type === 'list_item',
		always: true,
	});

	const nextListItemPath = Path.next(listItemPath);
	const newParagraphPath = [...nextListItemPath, 0];
	const [newNode] = Editor.node(editor, newParagraphPath);
	if (Element.isElement(newNode)) {
		Transforms.setNodes(editor, { paddingTop: 0.5 } as Partial<BlockNode>, { at: newParagraphPath });
	}

	return true;
}
