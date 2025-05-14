/* eslint-disable @typescript-eslint/naming-convention */
import { MoveNodeOperation, RemoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_moveNode(
	confirmed: RemoveNodeOperation,
	toTransform: MoveNodeOperation,
): MoveNodeOperation {
	const transformed = { ...toTransform };

	transformPath(confirmed, transformed);
	return transformed;
}
