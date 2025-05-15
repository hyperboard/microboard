import { Editor, Transforms } from "slate";
import { CustomEditor } from "Board/Items/RichText/Editor/Editor.d";

export function clearAllTextNodes(editor: CustomEditor) {
	for (const [node, path] of Editor.nodes(editor, {
		match: n => n.type === "text",
	})) {
		Transforms.removeNodes(editor, { at: path });
		Transforms.setNodes(editor, { ...node, text: "" }, { at: path });
	}
}
