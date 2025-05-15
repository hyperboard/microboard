import { MoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function moveNode_moveNode(
	confirmed: MoveNodeOperation,
	toTransform: MoveNodeOperation,
): MoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
