import { InsertTextOperation, Path } from "slate";

export function insertText_insertText(
	confirmed: InsertTextOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	console.log("insertText_insertText");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.offset) {
			transformed.offset += confirmed.text.length;
		}
	}
	return transformed;
}
