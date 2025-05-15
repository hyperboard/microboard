import { MoveNodeOperation, RemoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function moveNode_removeNode(
	confirmed: MoveNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
