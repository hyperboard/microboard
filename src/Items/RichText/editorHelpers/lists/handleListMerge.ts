import { Range, Editor, Path, Transforms } from 'slate';
import { CustomEditor } from '../../Editor/Editor';
import { isCursorAtStartOfFirstChild } from '../common/isCursorAtStartOfFirstChild';
import { getAreAllChildrenEmpty } from '../common/getAreAllChildrenEmpty';
import {ListItemNode} from "../../Editor/BlockNode";

export function handleListMerge(editor: CustomEditor): boolean {
  if (!editor.selection) {
    return false;
  }

  const { anchor } = editor.selection;

  if (anchor.offset !== 0 || !Range.isCollapsed(editor.selection)) {
    return false;
  }

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

  const listItemIndex = listItemPath[listItemPath.length - 1];
  const currentListItemChildren = listItem.children;

  if (listItemIndex === 0) {
    const listParentPath = Path.parent(listPath);

    const currentListItemChildren = [...listItem.children];

    Transforms.removeNodes(editor, { at: listItemPath });

    const [updatedList] = Editor.node(editor, listPath);
    if (getAreAllChildrenEmpty(updatedList as ListItemNode)) {
      Transforms.removeNodes(editor, { at: listPath });
    }
    const listPosition = listPath[listPath.length - 1];

    currentListItemChildren.forEach((childNode, index) => {
      const copiedNode = structuredClone(childNode);
      copiedNode.paddingTop = 0;
      Transforms.insertNodes(editor, copiedNode, {
        at: [...listParentPath, listPosition + index],
      });
    });
    Transforms.select(editor, {
      anchor: {
        path: [...listParentPath, listPosition, 0],
        offset: 0,
      },
      focus: {
        path: [...listParentPath, listPosition, 0],
        offset: 0,
      },
    });
  } else {
    const previousItemPath = Path.previous(listItemPath);
    const [previousItem] = Editor.node(editor, previousItemPath);
    if ("text" in previousItem) {
      return false;
    }

    currentListItemChildren.forEach((childNode, index) => {
      const copiedNode = structuredClone(childNode);
      copiedNode.paddingTop = 0;
      Transforms.insertNodes(editor, copiedNode, {
        at: [...previousItemPath, previousItem.children.length + index],
      });
    });

    Transforms.removeNodes(editor, { at: listItemPath });
    Transforms.select(editor, {
      anchor: {
        path: [...previousItemPath, previousItem.children.length, 0],
        offset: 0,
      },
      focus: {
        path: [...previousItemPath, previousItem.children.length, 0],
        offset: 0,
      },
    });
  }

  return true;
}
