import { SetNodeOperation, RemoveNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function setNode_removeNode(
	confirmed: SetNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	console.log("setNode_removeNode");
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
