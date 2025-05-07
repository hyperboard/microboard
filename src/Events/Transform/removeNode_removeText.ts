import { RemoveNodeOperation, RemoveTextOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_removeText(
	confirmed: RemoveNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
