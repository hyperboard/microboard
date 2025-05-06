import { SplitNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_splitNode(
	confirmed: SplitNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	// Clone the operation to avoid mutating the original
	const transformed: SplitNodeOperation = { ...toTransform };

	// Check if both operations refer to the exact same path
	const samePath = Path.equals(confirmed.path, transformed.path);

	// If they target the same node and the confirmed split comes before or at the toTransform split,
	// adjust the position accordingly
	if (samePath && confirmed.position <= transformed.position) {
		transformed.position -= confirmed.position;
	}

	// Apply path transformation:
	// - Always transform when operations are on different nodes (affecting siblings)
	// - When on the same node, only transform if splitting a deeper node (path length > 1)
	//   and the confirmed split position comes before or at the toTransform split
	if (!samePath) {
		transformPath(confirmed, transformed);
	} else if (
		samePath &&
		confirmed.position <= toTransform.position &&
		confirmed.path.length > 1
	) {
		transformPath(confirmed, transformed);
	}

	return transformed;
}
