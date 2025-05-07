import { MergeNodeOperation, RemoveTextOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function mergeNode_removeText(
	confirmed: MergeNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		transformed.offset += confirmed.position;
	}
	transformPath(confirmed, transformed);
	return transformed;
}
