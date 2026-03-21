import { TextNode } from 'Items/RichText/Editor/TextNode';
import { Editor } from 'slate';

export function getAllTextNodesInSelection(editor: Editor): TextNode[] {
	const { selection } = editor;
	if (!selection) {
		return [];
	}

	const textNodes: TextNode[] = [];
	for (const [node] of Editor.nodes(editor, {
		at: selection,
		match: (n: any) => (n as any).type === "text",
	})) {
		textNodes.push(node as TextNode);
	}

	return textNodes;
}
