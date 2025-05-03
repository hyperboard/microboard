import { SetNodeOperation, InsertNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function setNode_insertNode(
	confirmed: SetNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	console.log("setNode_insertNode");
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
