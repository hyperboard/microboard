import { RemoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_removeNode(
	confirmed: RemoveNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
