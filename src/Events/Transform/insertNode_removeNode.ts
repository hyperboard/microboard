import { InsertNodeOperation, RemoveNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function insertNode_removeNode(
	confirmed: InsertNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	console.log("insertNode_removeNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
