import { RemoveTextOperation, MergeNodeOperation } from "slate";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeText_mergeNode(
	confirmed: RemoveTextOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed: MergeNodeOperation = { ...toTransform };

	// Check if the confirmedPath is the node being merged into (the one before the merge path)
	const mergeDestinationPath = [
		...toTransform.path.slice(0, -1),
		toTransform.path[toTransform.path.length - 1] - 1,
	];
	const isAffectingMerge =
		confirmed.path.length === mergeDestinationPath.length &&
		confirmed.path.every((index, i) => index === mergeDestinationPath[i]);

	// If not affecting the merge destination, position remains unchanged
	if (!isAffectingMerge) {
		return transformed;
	}

	// If removal happens at or before the merge position, adjust it
	if (confirmed.offset <= toTransform.position) {
		transformed.position = Math.max(
			0,
			toTransform.position - confirmed.text.length,
		);
	}

	return transformed;
}
