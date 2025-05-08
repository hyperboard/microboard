import { InsertNodeOperation, SetNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertNode_setNode(
	confirmed: InsertNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
