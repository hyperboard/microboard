import { RemoveNodeOperation, SplitNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_splitNode(
	confirmed: RemoveNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	console.log("removeNode_splitNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
