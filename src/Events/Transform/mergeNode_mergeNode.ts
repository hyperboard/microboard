import { MergeNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function mergeNode_mergeNode(
	confirmed: MergeNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };

	// 1) If merging exactly the same node, accumulate position and return immediately
	if (Path.equals(confirmed.path, transformed.path)) {
		transformed.position += confirmed.position;
		return transformed;
	}

	const origPath = transformed.path;
	const remPath = confirmed.path;
	const prefixLen = remPath.length;

	// 2) If the toTransform is a descendant of the merged node, leave its path unchanged
	if (
		origPath.length > prefixLen &&
		remPath.every((seg, i) => origPath[i] === seg)
	) {
		return transformed;
	}

	// 3) Otherwise, adjust path for sibling shifts via shared transformPath logic
	transformPath(confirmed, transformed);
	return transformed;
}
