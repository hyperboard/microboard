import { Range, Editor, Path, Transforms, Text, Element } from 'slate';
import { CustomEditor } from '../../Editor/Editor';
import { isCursorAtStartOfFirstChild } from '../common/isCursorAtStartOfFirstChild';
import { getAreAllChildrenEmpty } from '../common/getAreAllChildrenEmpty';
import {ListItemNode, BlockNode} from "../../Editor/BlockNode";

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
    !Text.isText(textNode) ||
    !isCursorAtStartOfFirstChild(editor, textNodePath)
  ) {
    return false;
  }

  const paragraphPath = Path.parent(textNodePath);
  const [paragraph] = Editor.node(editor, paragraphPath);
  if (
    !paragraph || 
    Editor.isEditor(paragraph) || 
    !Element.isElement(paragraph) || 
    !isCursorAtStartOfFirstChild(editor, paragraphPath)
  ) {
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
    ((list as unknown as BlockNode).type !== "ul_list" && (list as unknown as BlockNode).type !== "ol_list")
  ) {
    return false;
  }

  const listItemIndex = listItemPath[listItemPath.length - 1];
  const listItemNode = listItem as unknown as ListItemNode;
  const currentListItemChildren = listItemNode.children;

  if (listItemIndex === 0) {
    const listParentPath = Path.parent(listPath);

    const currentListItemChildrenCopy = [...currentListItemChildren];

    Transforms.removeNodes(editor, { at: listItemPath });

    const [updatedList] = Editor.node(editor, listPath);
    if (!Editor.isEditor(updatedList) && Element.isElement(updatedList) && getAreAllChildrenEmpty(updatedList as unknown as ListItemNode)) {
      Transforms.removeNodes(editor, { at: listPath });
    }
    const listPosition = listPath[listPath.length - 1];

    currentListItemChildrenCopy.forEach((childNode, index: number) => {
      const copiedNode = structuredClone(childNode) as BlockNode;
      copiedNode.paddingTop = 0;
      Transforms.insertNodes(editor, copiedNode as unknown as Node, {
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
    if (!previousItem || Editor.isEditor(previousItem) || !Element.isElement(previousItem) || (previousItem as unknown as BlockNode).type !== 'list_item') {
      return false;
    }

    const prevListItem = previousItem as unknown as ListItemNode;

    currentListItemChildren.forEach((childNode, index: number) => {
      const copiedNode = structuredClone(childNode) as BlockNode;
      copiedNode.paddingTop = 0;
      Transforms.insertNodes(editor, copiedNode as unknown as Node, {
        at: [...previousItemPath, prevListItem.children.length + index],
      });
    });

    Transforms.removeNodes(editor, { at: listItemPath });
    Transforms.select(editor, {
      anchor: {
        path: [...previousItemPath, prevListItem.children.length, 0],
        offset: 0,
      },
      focus: {
        path: [...previousItemPath, prevListItem.children.length, 0],
        offset: 0,
      },
    });
  }

  return true;
}
