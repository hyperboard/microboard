import { Path, Range, Node } from "slate";
import { CustomEditor } from "../../Editor/Editor";

export function isCursorAtStartOfFirstChild(
	editor: CustomEditor,
	path: Path,
): boolean {
	const { selection } = editor;

	if (!selection) {
		return false;
	}

	const [start] = Range.edges(selection);

	const parentNode = Node.parent(editor, path);

	if (!parentNode.children) {
		return true;
	}

	return (
		parentNode.children[0] === Node.get(editor, path) && start.offset === 0
	);
}
