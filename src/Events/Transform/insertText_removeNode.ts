import { InsertTextOperation, RemoveNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function insertText_removeNode(
	confirmed: InsertTextOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	console.log("insertText_removeNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
