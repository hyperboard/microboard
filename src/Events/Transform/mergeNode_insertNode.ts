import { MergeNodeOperation, InsertNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function mergeNode_insertNode(
	confirmed: MergeNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	console.log("mergeNode_insertNode");
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
