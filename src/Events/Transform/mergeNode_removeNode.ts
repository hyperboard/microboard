import { MergeNodeOperation, RemoveNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function mergeNode_removeNode(
	confirmed: MergeNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
