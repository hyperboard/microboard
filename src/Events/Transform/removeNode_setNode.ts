import { RemoveNodeOperation, SetNodeOperation, Path } from "slate";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeNode_setNode(
	confirmed: RemoveNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation | undefined {
	const removalPath = confirmed.path;
	const originalPath = toTransform.path;

	// Drop the operation if it's targeting the removed node exactly
	if (Path.equals(removalPath, originalPath)) {
		return undefined;
	}

	// Shallow‐clone the operation (preserves extra props like `extra`)
	const transformedOp: SetNodeOperation = { ...toTransform };
	const newPath = [...originalPath];

	// 1) Root-level sibling shift: any first‐segment > removalPath[0] should decrement
	if (
		newPath.length > 0 &&
		removalPath.length > 0 &&
		newPath[0] > removalPath[0]
	) {
		newPath[0] = newPath[0] - 1;
	}

	// 2) Nested sibling shift at the removal’s parent level
	if (removalPath.length > 1) {
		const depthIndex = removalPath.length - 1;
		const parentPrefix = removalPath.slice(0, depthIndex);
		// If this op shares the same parent and its index is after the removed one, shift it
		if (
			newPath.length > depthIndex &&
			Path.equals(parentPrefix, newPath.slice(0, depthIndex)) &&
			newPath[depthIndex] > removalPath[depthIndex]
		) {
			newPath[depthIndex] = newPath[depthIndex] - 1;
		}
	}

	transformedOp.path = newPath;
	return transformedOp as SetNodeOperation;
}
