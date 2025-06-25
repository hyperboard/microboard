import { Editor, Transforms } from 'slate';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import {TextNode} from "../../Editor/TextNode";

export function clearAllTextNodes(editor: CustomEditor) {
	for (const [node, path] of Editor.nodes(editor, {
		match: n => !Editor.isEditor(n) && n.type === 'text',
	})) {
		Transforms.removeNodes(editor, { at: path });
		Transforms.setNodes(editor, { ...(node as TextNode), text: '' }, { at: path });
	}
}
