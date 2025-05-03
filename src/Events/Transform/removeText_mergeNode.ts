import { RemoveTextOperation, MergeNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function removeText_mergeNode(
	confirmed: RemoveTextOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	console.log("removeText_mergeNode");
	const transformed = { ...toTransform };
	if (Path.isSibling(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position += confirmed.text.length;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}
