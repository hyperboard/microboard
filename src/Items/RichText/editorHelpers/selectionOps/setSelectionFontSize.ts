import { Editor, Transforms } from "slate";
import { getAllTextNodesInSelection } from "Board/Items/RichText/editorHelpers/common/getAllTextNodesInSelection";
import { getParagraphWithPassedTextNode } from "Board/Items/RichText/editorHelpers/common/getParagraph";
import { ReactEditor } from "slate-react";
import { getSelectionMarks } from "Board/Items/RichText/editorHelpers/common/getSelectionMarks";
import { isTextEmpty } from "Board/Items/RichText/editorHelpers/common/isTextEmpty";
import { insertCopiedNodes } from "Board/Items/RichText/editorHelpers/selectionOps/insertCopiedNodes";

export function setSelectionFontSize(
	editor: Editor,
	isAutosize: boolean,
	fontSize: number | "auto",
	selectionContext?: string,
): boolean {
	const size = fontSize;
	if (!editor) {
		throw new Error("Editor is not initialized");
	}
	const selection = editor.selection;
	const marks = getSelectionMarks(editor);
	if (!marks) {
		throw new Error("Editor can not get selection marks");
	}

	if (
		JSON.stringify(selection?.anchor) === JSON.stringify(selection?.focus)
	) {
		Transforms.select(editor, {
			anchor: Editor.start(editor, []),
			focus: Editor.end(editor, []),
		});
	}
	const isEmpty = isTextEmpty(editor.children);
	let shouldUpdateElement = false;

	// changing empty Sticker fontSize type (number->auto / auto->number) leads to undefined behaviour
	// next line doenst allow empty text to change fontSize type --- TODO fix
	if (!isEmpty || (size !== "auto" && !isAutosize)) {
		if (size === 14 && isAutosize) {
			// autoSize is based on 14 => need to disable autoSizing in decorated.apply
			Editor.addMark(editor, "fontSize", 1);
			return shouldUpdateElement;
		}
		if (isEmpty) {
			const firstTextNode = getAllTextNodesInSelection(editor)[0];
			if (firstTextNode) {
				const placeholderNode = structuredClone(firstTextNode);
				placeholderNode.fontSize = fontSize;
				const paragraph =
					getParagraphWithPassedTextNode(placeholderNode);
				insertCopiedNodes(editor, paragraph);
				shouldUpdateElement = true;
			}
		} else {
			Editor.addMark(editor, "fontSize", size);
		}
	}

	if (selectionContext === "EditTextUnderPointer") {
		ReactEditor.focus(editor);
	}
	return shouldUpdateElement;
}
