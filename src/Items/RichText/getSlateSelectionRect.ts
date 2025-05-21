import { EditorContainer } from "./EditorContainer";

export function getSlateSelectionRect(
	editor: EditorContainer,
): null | { firstRect: DOMRect; lastRect: DOMRect } {
	if (!editor.getSelection() || !editor.hasTextInSelection()) {
		return null;
	}

	const domSelection = window.getSelection();
	if (!domSelection || domSelection.rangeCount === 0) {
		return null;
	}

	const range = domSelection.getRangeAt(0);
	const clientRects = range.getClientRects();

	if (clientRects.length === 0) {
		return null;
	}

	const firstRect = clientRects[0];
	const lastRect = clientRects[clientRects.length - 1];

	return {
		firstRect,
		lastRect,
	};
}
