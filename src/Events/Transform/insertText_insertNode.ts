import { InsertTextOperation, InsertNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function insertText_insertNode(
	confirmed: InsertTextOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	console.log("insertText_insertNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
