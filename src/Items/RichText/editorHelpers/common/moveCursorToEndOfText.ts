import { Editor, Transforms } from 'slate';
import { selectWholeText } from 'Items/RichText/editorHelpers/common/selectWholeText';

export function moveCursorToEndOfTheText(editor: Editor, delay = 10): Promise<void> {
	const moveCursorToTheEndOfTheText = (): void => {
		selectWholeText(editor);
		Transforms.collapse(editor, { edge: 'end' });
	};

	return new Promise<void>(resolve => {
		if (delay === 0) {
			moveCursorToTheEndOfTheText();
			resolve();
		} else {
			setTimeout(() => {
				moveCursorToTheEndOfTheText();
				resolve();
			}, delay);
		}
	});
}
