import { SplitNodeOperation, InsertNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function splitNode_insertNode(
	confirmed: SplitNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	console.log("splitNode_insertNode");
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
