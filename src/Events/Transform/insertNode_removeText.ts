import { InsertNodeOperation, RemoveTextOperation } from "slate";
import { transformPath } from "./Transform";

export function insertNode_removeText(
	confirmed: InsertNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	console.log("insertNode_removeText");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
