import { Editor, Range } from "slate";

export function hasTextInSelection(editor: Editor): boolean {
	const { selection } = editor;
	if (!selection || Range.isCollapsed(selection)) {
		return false;
	}

	const [start, end] = Range.edges(selection);
	const text = Editor.string(editor, { anchor: start, focus: end });
	return text.length > 0;
}
