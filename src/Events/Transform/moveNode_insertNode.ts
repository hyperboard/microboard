import { InsertNodeOperation, MoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function moveNode_insertNode(
	confirmed: MoveNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
