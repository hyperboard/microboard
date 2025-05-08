import { InsertNodeOperation, InsertTextOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertNode_insertText(
	confirmed: InsertNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
