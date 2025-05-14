/* eslint-disable @typescript-eslint/naming-convention */
import { MoveNodeOperation, MergeNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function mergeNode_moveNode(
	confirmed: MergeNodeOperation,
	toTransform: MoveNodeOperation,
): MoveNodeOperation {
	const transformed = { ...toTransform };

	transformPath(confirmed, transformed);
	return transformed;
}
