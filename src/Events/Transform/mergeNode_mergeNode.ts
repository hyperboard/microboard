import { MergeNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function mergeNode_mergeNode(
	confirmed: MergeNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	console.log("mergeNode_mergeNode");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		transformed.position += confirmed.position;
	}
	transformPath(confirmed, transformed);
	return transformed;
}
