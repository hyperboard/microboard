import { SetNodeOperation, InsertNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function setNode_insertNode(
	confirmed: SetNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}
