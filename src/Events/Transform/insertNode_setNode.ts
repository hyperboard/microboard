import { InsertNodeOperation, SetNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function insertNode_setNode(
	confirmed: InsertNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	console.log("insertNode_setNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
