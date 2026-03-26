import { TextNode } from 'Items/RichText/Editor/TextNode';
import { Editor, Range, Text } from 'slate';

export function getSelectionMarks(editor: Editor): Omit<TextNode, 'text'> | null {
	const marks = Editor.marks(editor);
	if (!editor.selection) {
		return marks;
	}

	if (!Range.isExpanded(editor.selection) || (marks && Object.keys(marks).length > 0)) {
		return marks;
	}

	const textEntries = Array.from(
		Editor.nodes(editor, {
			at: editor.selection,
			match: node => Text.isText(node),
		})
	);

	const [firstEntry, ...restEntries] = textEntries;
	if (!firstEntry) {
		return marks;
	}

	const { text: _firstText, ...firstMarks } = firstEntry[0] as TextNode;
	const commonMarks: Record<string, unknown> = { ...firstMarks };

	for (const [node] of restEntries) {
		const { text: _text, ...nodeMarks } = node as TextNode;
		for (const key of Object.keys(commonMarks)) {
			if (commonMarks[key] !== (nodeMarks as Record<string, unknown>)[key]) {
				delete commonMarks[key];
			}
		}
	}

	return commonMarks as Omit<TextNode, 'text'>;
}
