import { InsertTextOperation, MergeNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function insertText_mergeNode(
	confirmed: InsertTextOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	console.log("insertText_mergeNode");
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
