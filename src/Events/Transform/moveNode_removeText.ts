import { MoveNodeOperation, RemoveTextOperation } from "slate";
import { transformPath } from "./transformPath";

export function moveNode_removeText(
	confirmed: MoveNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
