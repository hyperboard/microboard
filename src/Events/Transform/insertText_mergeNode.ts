import { InsertTextOperation, MergeNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function insertText_mergeNode(
	confirmed: InsertTextOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	if (
		Path.isBefore(confirmed.path, toTransform.path) &&
		Path.isSibling(confirmed.path, toTransform.path)
	) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position += confirmed.text.length;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}
