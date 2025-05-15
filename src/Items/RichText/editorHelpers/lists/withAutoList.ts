import { Transforms } from "slate";
import { CustomEditor } from "Board/Items/RichText/Editor/Editor.d";
import { clearAllTextNodes } from "Board/Items/RichText/editorHelpers/common/clearAllTextNodes";

export function withAutoList(editor: CustomEditor): boolean {
	const { selection } = editor;
	if (!selection) {
		return false;
	}

	const nodes = editor.children;

	if (
		nodes.length !== 1 ||
		nodes[0].type !== "paragraph" ||
		nodes[0].children.length !== 1
	) {
		return false;
	}

	if (nodes[0].children[0].text !== "1.") {
		return false;
	}

	Transforms.wrapNodes(
		editor,
		{ type: "ol_list", listLevel: 1, children: [] },
		{ at: selection },
	);
	Transforms.wrapNodes(
		editor,
		{ type: "list_item", children: [] },
		{ at: selection },
	);

	clearAllTextNodes(editor);

	return true;
}
