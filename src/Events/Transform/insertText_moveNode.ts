/* eslint-disable @typescript-eslint/naming-convention */
import { InsertTextOperation, MoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertText_moveNode(
	confirmed: InsertTextOperation,
	toTransform: MoveNodeOperation,
): MoveNodeOperation {
	const transformed = { ...toTransform };

	transformPath(confirmed, transformed);
	return transformed;
}
