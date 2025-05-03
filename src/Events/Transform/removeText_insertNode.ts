import { RemoveTextOperation, InsertNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeText_insertNode(
	confirmed: RemoveTextOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	console.log("removeText_insertNode");
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
