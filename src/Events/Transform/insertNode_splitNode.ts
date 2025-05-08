import { InsertNodeOperation, SplitNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertNode_splitNode(
	confirmed: InsertNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
