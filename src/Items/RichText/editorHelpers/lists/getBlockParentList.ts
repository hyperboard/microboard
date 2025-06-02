import { BlockNode } from 'Items/RichText/Editor/BlockNode';
import { Editor, Path } from 'slate';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';

export function getBlockParentList(
	editor: CustomEditor,
	blockPath: number[]
): [node: BlockNode, path: number[]] | null {
	const listItemPath = Path.parent(blockPath);
	const [listItem] = Editor.node(editor, listItemPath);
	if (!listItem || listItem.type !== 'list_item') {
		return null;
	}

	const listPath = Path.parent(listItemPath);
	const [list] = Editor.node(editor, listPath);
	if (!list || (list.type !== 'ol_list' && list.type !== 'ul_list')) {
		return null;
	}

	return [list, listPath];
}
