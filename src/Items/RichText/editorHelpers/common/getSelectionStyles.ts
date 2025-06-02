import { getAllTextNodesInSelection } from 'Items/RichText/editorHelpers/common/getAllTextNodesInSelection';
import { TextNode, TextStyle } from 'Items/RichText/Editor/TextNode';
import { findCommonStrings } from 'Items/RichText/utils';
import { Editor } from 'slate';

export function getSelectionStyles(editor: Editor): string[] | undefined {
	const { selection } = editor;
	if (!selection) {
		return;
	}

	const nodes = getAllTextNodesInSelection(editor);
	const styles: TextStyle[][] = nodes.reduce((acc: TextStyle[][], node: TextNode) => {
		const styles: TextStyle[] = [];
		if (node.text === '') {
			return acc;
		}

		if (node.bold) {
			styles.push('bold');
		}

		if (node.italic) {
			styles.push('italic');
		}

		if (node.underline) {
			styles.push('underline');
		}

		if (node['line-through']) {
			styles.push('line-through');
		}
		acc.push(styles);
		return acc;
	}, []);

	return findCommonStrings(styles);
}
