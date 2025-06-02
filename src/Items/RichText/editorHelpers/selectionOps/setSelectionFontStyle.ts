import { TextStyle } from 'Items/RichText/Editor/TextNode';
import { Editor } from 'slate';
import { getEachNodeInSelectionStyles } from 'Items/RichText/editorHelpers/common/getEachNodeInSelectionStyles';

export function setSelectionFontStyle(editor: Editor, style: TextStyle | TextStyle[]): void {
	const styleList = Array.isArray(style) ? style : [style];
	for (const style of styleList) {
		const selectionStyles = getEachNodeInSelectionStyles(editor);
		const isAllNodesContainStyle = selectionStyles.every(styleArr => styleArr.includes(style));

		const isSomeNodeContainStyle = selectionStyles.some(styleArr => styleArr.includes(style));

		const isAllNodesNotContainStyle = selectionStyles.every(
			styleArr => !styleArr.includes(style)
		);

		if (isAllNodesContainStyle) {
			Editor.addMark(editor, style, false);
		} else if (isSomeNodeContainStyle || isAllNodesNotContainStyle) {
			Editor.addMark(editor, style, true);
		}
	}
}
