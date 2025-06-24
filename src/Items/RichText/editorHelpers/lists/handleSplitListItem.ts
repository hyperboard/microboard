import { Descendant, Editor, Element, Node, Path, Range, Transforms } from 'slate';
import { getAreAllChildrenEmpty } from 'Items/RichText/editorHelpers/common/getAreAllChildrenEmpty';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import { createParagraphNode } from 'Items/RichText/editorHelpers/common/createParagraphNode';
import {BlockNode} from "../../Editor/BlockNode";
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
	if (!Node.isNode(textNode) || Editor.isEditor(textNode) || !('text' in textNode)) {
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
	if (!Element.isElement(listItemNode) || listItemNode.type !== 'list_item') {
		return false;
	}

	const listPath = Path.parent(listItemPath);
	const listEntry = Editor.node(editor, listPath);
	if (!listEntry) {
		return false;
	}
	const [listNode] = listEntry;
	if (
		!Element.isElement(listNode) ||
		(listNode.type !== 'ol_list' && listNode.type !== 'ul_list')
	) {
		return false;
	}

	const isBlockEmpty = textNode.text === '';
	const isOnlyChildParagraph = listItemNode.children.length === 1;

	if (isBlockEmpty && isOnlyChildParagraph) {
		const listItemIndex = listItemPath[listItemPath.length - 1];
		const [parentList, parentListPath] = Editor.parent(editor, listItemPath);
		if (Editor.isEditor(parentList) || (parentList.type !== "ol_list" && parentList.type !== "ul_list")) {
			return false;
		}
		const listType = parentList.type;

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

			if (parentList.children.length > listItemIndex + 1) {
				const newListPath = Path.next(nextPath);
				const itemsAfter = parentList.children.slice(listItemIndex + 1) as BlockNode[];

				Transforms.insertNodes(
					editor,
					{
						type: listType,
						listLevel: listNode.listLevel || 0,
						children: itemsAfter.map(item => ({
							type: 'list_item',
							children: item.children as BlockNode[],
						})),
					},
					{ at: newListPath }
				);
			}

			Transforms.removeNodes(editor, {
				at: parentListPath,
				match: (n, path) => path[path.length - 1] >= listItemIndex,
			});

			const [updatedParentList] = Editor.node(editor, parentListPath);
			if (Editor.isEditor(updatedParentList)) {
				return false;
			}
			if (getAreAllChildrenEmpty(updatedParentList)) {
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
		match: n => Element.isElement(n) && n.type === 'list_item',
		always: true,
	});

	const nextListItemPath = Path.next(listItemPath);
	const newParagraphPath = [...nextListItemPath, 0];
	const [newNode] = Editor.node(editor, newParagraphPath);
	if (Element.isElement(newNode)) {
		Transforms.setNodes(editor, { paddingTop: 0.5 }, { at: newParagraphPath });
	}

	return true;
}
