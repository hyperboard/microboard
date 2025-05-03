import { RemoveTextOperation, SplitNodeOperation } from "slate";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeText_splitNode(
	confirmed: RemoveTextOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	// Check if operations are on different paths
	if (
		confirmed.path.length !== toTransform.path.length ||
		confirmed.path.some((value, index) => value !== toTransform.path[index])
	) {
		return toTransform;
	}

	// If the entire split position is removed, return a no-op operation
	if (
		confirmed.offset <= toTransform.position &&
		confirmed.offset + confirmed.text.length >= toTransform.position
	) {
		return {
			...toTransform,
			position: 0, // No-op position
		};
	}

	// Adjust position if text is removed before split point
	if (confirmed.offset < toTransform.position) {
		const adjustedPosition = Math.max(
			0,
			toTransform.position - confirmed.text.length,
		);

		return {
			...toTransform,
			position: adjustedPosition,
		};
	}

	// If text is removed after split point, return original operation
	return toTransform;
}
