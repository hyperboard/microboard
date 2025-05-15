import { MergeNodeOperation, MoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function moveNode_mergeNode(
	confirmed: MoveNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
