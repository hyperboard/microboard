import { MergeNodeOperation, InsertTextOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function mergeNode_insertText(
	confirmed: MergeNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };

	// 1) If the insert is at exactly the merged path, add the merged length to offset,
	//    and do not shift the path further.
	if (Path.equals(confirmed.path, transformed.path)) {
		transformed.offset += confirmed.position;
		return transformed;
	}

	transformPath(confirmed, transformed);
	return transformed;
}
