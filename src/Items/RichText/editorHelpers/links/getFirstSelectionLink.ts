import { BaseSelection, Editor } from "slate";

export function getFirstSelectionLink(
	editor: Editor,
	selection: BaseSelection,
): string | undefined {
	if (!selection) {
		return;
	}

	for (const [node] of Editor.nodes(editor, {
		at: selection,
		match: n => !!n.link,
	})) {
		return node.link;
	}

	return;
}
