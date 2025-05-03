import { RemoveNodeOperation, MergeNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_mergeNode(
	confirmed: RemoveNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	console.log("removeNode_mergeNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
