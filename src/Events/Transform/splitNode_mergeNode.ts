import { SplitNodeOperation, MergeNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function splitNode_mergeNode(
	confirmed: SplitNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	console.log("splitNode_mergeNode");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.position <= toTransform.position) {
			transformed.position -= confirmed.position;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}
