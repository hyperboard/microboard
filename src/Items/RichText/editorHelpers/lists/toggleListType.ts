import { ListType } from 'Items/RichText/Editor/BlockNode';
import { Editor, Element, Path, Range, Transforms } from 'slate';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import { wrapIntoList } from 'Items/RichText/editorHelpers/lists/wrapIntoList';
import { toggleListTypeForSelection } from 'Items/RichText/editorHelpers/lists/toggleListTypeForSelection';

export function toggleListType(
	editor: CustomEditor,
	targetListType: ListType,
	shouldWrap = true
): boolean {
	const { selection } = editor;

	if (!selection) {
		return false;
	}

	if (!Range.isCollapsed(selection)) {
		return toggleListTypeForSelection(editor, targetListType);
	}

	let result = true;

	Editor.withoutNormalizing(editor, () => {
		const { anchor } = selection;
		const [textNode, textNodePath] = Editor.node(editor, anchor.path);
		if (!textNode || textNode.type !== 'text' || typeof textNode.text !== 'string') {
			result = false;
			return;
		}

		const paragraphPath = Path.parent(textNodePath);
		const [paragraph] = Editor.node(editor, paragraphPath);
		if (!paragraph) {
			result = false;
			return;
		}

		const listItemPath = Path.parent(paragraphPath);
		const [listItem] = Editor.node(editor, listItemPath);
		if (!listItem || listItem.type !== 'list_item') {
			if (shouldWrap) {
				wrapIntoList(editor, targetListType, selection);
				return;
			}
			result = false;
			return;
		}

		const listPath = Path.parent(listItemPath);
		const [list] = Editor.node(editor, listPath);
		if (!list || (list.type !== 'ol_list' && list.type !== 'ul_list')) {
			if (shouldWrap) {
				wrapIntoList(editor, targetListType, selection);
				return;
			}
			result = false;
			return;
		}

		if (list.type === targetListType) {
			// Get all children in the parent list so we can split properly
			const listChildren = [...(list.children as Element[])];

			if (listChildren.length === 1) {
				// If there's only one item, unwrap the entire list
				Transforms.unwrapNodes(editor, {
					at: listPath,
					match: n => Element.isElement(n) && n.type === 'list_item',
					split: true,
				});

				Transforms.unwrapNodes(editor, {
					at: listPath,
					match: n =>
						Element.isElement(n) && (n.type === 'ol_list' || n.type === 'ul_list'),
					split: true,
				});
			} else {
				// Split the list and unwrap just the current item
				const listItemIndex = listItemPath[listItemPath.length - 1];

				// If not the first item, we need to split the list before the current item
				if (listItemIndex > 0) {
					Transforms.splitNodes(editor, {
						at: [...listItemPath, 0],
						match: n => Element.isElement(n) && n.type === list.type,
					});
				}

				// If not the last item, we need to split after the current item too
				if (listItemIndex < listChildren.length - 1) {
					const nextPath = Path.next(listItemPath);
					Transforms.splitNodes(editor, {
						at: nextPath,
						match: n => Element.isElement(n) && n.type === list.type,
					});
				}

				// Now unwrap just the list item at the selection
				Transforms.unwrapNodes(editor, {
					at: paragraphPath,
					match: n => Element.isElement(n) && n.type === 'list_item',
					split: true,
				});

				Transforms.unwrapNodes(editor, {
					at: paragraphPath,
					match: n =>
						Element.isElement(n) && (n.type === 'ol_list' || n.type === 'ul_list'),
					split: true,
				});
			}
		} else if (shouldWrap) {
			Transforms.setNodes(
				editor,
				{
					type: targetListType,
					listLevel: list.listLevel || 1,
				},
				{ at: listPath }
			);
		}
		return;
	});

	return result;
}
