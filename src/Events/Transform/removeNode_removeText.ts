import { RemoveNodeOperation, RemoveTextOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_removeText(
	confirmed: RemoveNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	console.log("removeNode_removeText");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
