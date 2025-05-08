import { InsertNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertNode_insertNode(
	confirmed: InsertNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
