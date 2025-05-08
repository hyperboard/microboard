import { SplitNodeOperation, MergeNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_mergeNode(
	confirmed: SplitNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	const confPath = confirmed.path;
	const tPath = transformed.path;

	// If this is the same node, only adjust position and skip any path shifting
	if (Path.equals(confPath, tPath)) {
		if (confirmed.position <= transformed.position) {
			transformed.position -= confirmed.position;
		}
		return transformed;
	}

	// Otherwise, apply the usual path transformation (siblings, nested shifts, etc.)
	transformPath(confirmed, transformed);
	return transformed;
}
