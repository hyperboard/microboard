import { RemoveTextOperation, InsertNodeOperation } from "slate";
import { transformPath } from "./transformPath";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeText_insertNode(
	confirmed: RemoveTextOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
