import { SplitNodeOperation, SetNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_setNode(
	confirmed: SplitNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	const transformed = { ...toTransform };
	const confirmedPath = confirmed.path;
	const currentPath = transformed.path;

	// Don’t run the generic sibling-shift when
	// 1) it's exactly the same node, or
	// 2) it's a deeper descendant of a nested split (we only shift descendants of root‐level splits)
	const isSame = Path.equals(currentPath, confirmedPath);
	const isDeepNestedDescendant =
		confirmedPath.length > 1 &&
		currentPath.length > confirmedPath.length &&
		currentPath
			.slice(0, confirmedPath.length)
			.every((seg, i) => seg === confirmedPath[i]);

	if (!isSame && !isDeepNestedDescendant) {
		transformPath(confirmed, transformed);
	}

	return transformed;
}
