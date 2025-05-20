import { BlockNode } from "Board/Items/RichText/Editor/BlockNode";
import { Editor, Element } from "slate";

export function getSelectedBlockNode(editor: Editor): BlockNode | null {
	const { selection } = editor;
	if (!selection) {
		return null;
	}
	const [node] = Editor.node(editor, selection);
	if (Editor.isEditor(node) || !Element.isElement(node)) {
		return null;
	}
	return node;
}
