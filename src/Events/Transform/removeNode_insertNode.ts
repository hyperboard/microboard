import { RemoveNodeOperation, InsertNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeNode_insertNode(
	confirmed: RemoveNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
