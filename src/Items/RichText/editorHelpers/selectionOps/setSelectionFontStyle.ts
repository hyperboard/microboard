import { TextStyle } from 'Items/RichText/Editor/TextNode';
import { Editor, Range, Transforms } from 'slate';
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

		let value: boolean;
		if (isAllNodesContainStyle) {
			value = false;
		} else if (isSomeNodeContainStyle || isAllNodesNotContainStyle) {
			value = true;
		} else {
			continue;
		}

		const { selection } = editor;
		if (selection && Range.isExpanded(selection)) {
			(Transforms.setNodes as any)(
				editor,
				{ [style]: value },
				{
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					match: (n: any) => !Editor.isEditor(n) && (n as any).type === 'text',
					split: true,
				}
			);
		} else {
			Editor.addMark(editor, style, value);
		}
	}
}
