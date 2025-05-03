import { RemoveTextOperation, InsertTextOperation, Path } from "slate";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeText_insertText(
	confirmed: RemoveTextOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.offset) {
			transformed.offset -= confirmed.text.length;
		}
	}
	return transformed;
}
