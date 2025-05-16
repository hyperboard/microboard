import { BaseSelection, Editor, Transforms } from "slate";
import { CustomEditor } from "Board/Items/RichText/Editor/Editor.d";
import { selectWholeText } from "Board/Items/RichText/editorHelpers/common/selectWholeText";

export const setLink = (
	editor: CustomEditor,
	link: string | undefined,
	selection: BaseSelection,
) => {
	if (!selection) {
		selectWholeText(editor);
	} else {
		Transforms.select(editor, selection);
	}

	if (!editor.selection) {
		return;
	}

	const format = link ? "rgba(71, 120, 245, 1)" : "rgb(20, 21, 26)";

	Editor.addMark(editor, "fontColor", format);

	for (const [node, path] of Editor.nodes(editor, {
		match: n => n.type === "text",
	})) {
		const nodeRange = Editor.range(editor, path);
		Transforms.select(editor, nodeRange);
		Transforms.setNodes(
			editor,
			{ link },
			{ split: false, match: n => n.type === "text" },
		);
	}
};
