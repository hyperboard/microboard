/* eslint-disable @typescript-eslint/naming-convention */
import { InsertNodeOperation, MoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertNode_moveNode(
	confirmed: InsertNodeOperation,
	toTransform: MoveNodeOperation,
): MoveNodeOperation {
	const transformed = { ...toTransform };

	transformPath(confirmed, transformed);
	return transformed;
}
