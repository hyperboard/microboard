import { InsertTextOperation, InsertNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertText_insertNode(
	confirmed: InsertTextOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
