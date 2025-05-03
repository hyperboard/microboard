import { RemoveNodeOperation, InsertTextOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_insertText(
	confirmed: RemoveNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	console.log("removeNode_insertText");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
