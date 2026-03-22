import { BaseSelection, Editor, Transforms, Text } from 'slate';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import { selectWholeText } from 'Items/RichText/editorHelpers/common/selectWholeText';

export const setLink = (
	editor: CustomEditor,
	link: string | undefined,
	selection: BaseSelection
) => {
	if (!selection) {
		selectWholeText(editor);
	} else {
		Transforms.select(editor, selection);
	}

	if (!editor.selection) {
		return;
	}

	const format = link ? 'rgba(71, 120, 245, 1)' : 'rgb(20, 21, 26)';

	Transforms.setNodes(
		editor,
		{ fontColor: format },
		{
			match: (n) => Text.isText(n),
			split: true,
		}
	);

	for (const [, path] of Editor.nodes(editor, {
		match: n => Text.isText(n),
	})) {
		const nodeRange = Editor.range(editor, path);
		Transforms.select(editor, nodeRange);
		Transforms.setNodes(editor, { link }, { split: false, match: (n) => Text.isText(n) });
	}
};
