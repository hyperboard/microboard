/* eslint-disable @typescript-eslint/naming-convention */
import { SplitNodeOperation, MoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_moveNode(
	confirmed: SplitNodeOperation,
	toTransform: MoveNodeOperation,
): MoveNodeOperation {
	const transformed = { ...toTransform };

	transformPath(confirmed, transformed);
	return transformed;
}
