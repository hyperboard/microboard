import { Editor, Transforms } from 'slate';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';

export function selectWholeText(editor: CustomEditor): void {
	const start = Editor.start(editor, []);
	const end = Editor.end(editor, []);
	const range = { anchor: start, focus: end };
	Transforms.select(editor, range);
}
