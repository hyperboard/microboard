import { InsertNodeOperation, RemoveTextOperation } from "slate";
import { transformPath } from "./transformPath";

export function insertNode_removeText(
	confirmed: InsertNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
