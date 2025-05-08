import { SetNodeOperation, RemoveNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function setNode_removeNode(
	confirmed: SetNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
