import { BaseSelection, Editor } from "slate";
import {TextNode} from "../../Editor/TextNode";

export function getFirstSelectionLink(
	editor: Editor,
	selection: BaseSelection,
): string | undefined {
	if (!selection) {
		return;
	}

	for (const [node] of Editor.nodes(editor, {
		at: selection,
		match: n => "link" in n && !!n.link,
	})) {
		return (node as TextNode).link;
	}

	return;
}
