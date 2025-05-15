import { InsertTextOperation, MoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function moveNode_insertText(
	confirmed: MoveNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
