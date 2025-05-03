import { RemoveNodeOperation, InsertNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_insertNode(
	confirmed: RemoveNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	console.log("removeNode_insertNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
