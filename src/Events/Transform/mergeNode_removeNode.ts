import { MergeNodeOperation, RemoveNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function mergeNode_removeNode(
	confirmed: MergeNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	console.log("mergeNode_removeNode");
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
