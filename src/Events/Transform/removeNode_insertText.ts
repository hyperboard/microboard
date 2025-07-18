import { RemoveNodeOperation, InsertTextOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_insertText(
	confirmed: RemoveNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
