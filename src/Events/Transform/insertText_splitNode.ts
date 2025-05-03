import { InsertTextOperation, SplitNodeOperation, Path } from "slate";

export function insertText_splitNode(
	confirmed: InsertTextOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	console.log("insertText_splitNode");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position += confirmed.text.length;
		}
	}
	const newPath = Path.transform(transformed.path, confirmed);
	if (newPath) {
		transformed.path = newPath;
	}
	return transformed;
}
