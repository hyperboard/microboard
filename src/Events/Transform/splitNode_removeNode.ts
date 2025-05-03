import { SplitNodeOperation, RemoveNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_removeNode(
	confirmed: SplitNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	console.log("splitNode_removeNode");
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
