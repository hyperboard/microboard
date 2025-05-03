import { InsertNodeOperation, InsertTextOperation } from "slate";
import { transformPath } from "./Transform";

export function insertNode_insertText(
	confirmed: InsertNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	console.log("insertNode_insertText");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
