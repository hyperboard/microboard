/* eslint-disable @typescript-eslint/naming-convention */
import { MoveNodeOperation, SetNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function setNode_moveNode(
	confirmed: SetNodeOperation,
	toTransform: MoveNodeOperation,
): MoveNodeOperation {
	const transformed = { ...toTransform };

	transformPath(confirmed, transformed);
	return transformed;
}
