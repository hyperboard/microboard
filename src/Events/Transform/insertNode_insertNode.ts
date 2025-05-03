import { InsertNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function insertNode_insertNode(
	confirmed: InsertNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	console.log("insertNode_insertNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
