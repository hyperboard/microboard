import { RemoveTextOperation, InsertTextOperation, Path } from "slate";

export function removeText_insertText(
	confirmed: RemoveTextOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	console.log("removeText_insertText");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.offset) {
			transformed.offset -= confirmed.text.length;
		}
	}
	return transformed;
}
