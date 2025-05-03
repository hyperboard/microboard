import { RemoveTextOperation, RemoveNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function removeText_removeNode(
	confirmed: RemoveTextOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	console.log("removeText_removeNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
