import { MoveNodeOperation, SplitNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function moveNode_splitNode(
	confirmed: MoveNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
