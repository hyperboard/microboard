import { InsertNodeOperation, MergeNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertNode_mergeNode(
	confirmed: InsertNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	console.log("insertNode_mergeNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
