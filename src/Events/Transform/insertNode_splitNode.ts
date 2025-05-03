import { InsertNodeOperation, SplitNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertNode_splitNode(
	confirmed: InsertNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	console.log("insertNode_splitNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
