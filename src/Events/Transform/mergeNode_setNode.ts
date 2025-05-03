import { MergeNodeOperation, SetNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function mergeNode_setNode(
	confirmed: MergeNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	console.log("mergeNode_setNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
