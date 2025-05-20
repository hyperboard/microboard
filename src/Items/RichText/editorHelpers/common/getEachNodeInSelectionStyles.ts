import { getAllTextNodesInSelection } from "Board/Items/RichText/editorHelpers/common/getAllTextNodesInSelection";
import { TextStyle } from "Board/Items/RichText/Editor/TextNode";
import { Editor } from "slate";

export function getEachNodeInSelectionStyles(editor: Editor): string[][] {
	return getAllTextNodesInSelection(editor).map(n => {
		const styles: TextStyle[] = [];
		if (n.bold) {
			styles.push("bold");
		}

		if (n.italic) {
			styles.push("italic");
		}

		if (n.underline) {
			styles.push("underline");
		}

		if (n["line-through"]) {
			styles.push("line-through");
		}
		return styles;
	});
}
