import { MoveNodeOperation, SetNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function moveNode_setNode(
	confirmed: MoveNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
