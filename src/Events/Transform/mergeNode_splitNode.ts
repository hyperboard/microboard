import { MergeNodeOperation, SplitNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function mergeNode_splitNode(
	confirmed: MergeNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	console.log("mergeNode_splitNode");
	const transformed = { ...toTransform };
	// todo fix - add length of merged
	// if (Path.equals(confirmed.path, toTransform.path)) {
	// 	transformed.position += confirmed.position;
	// }
	transformPath(confirmed, transformed);
	return transformed;
}
