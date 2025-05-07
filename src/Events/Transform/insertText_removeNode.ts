import { InsertTextOperation, RemoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertText_removeNode(
	confirmed: InsertTextOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
