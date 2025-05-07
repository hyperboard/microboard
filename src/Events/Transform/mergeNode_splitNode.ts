import { MergeNodeOperation, SplitNodeOperation, Path } from "slate";

export function mergeNode_splitNode(
	confirmed: MergeNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	const rem = confirmed.path;
	const orig = transformed.path;

	// If splitting exactly at the merged node, add the merged length to the split position
	if (Path.equals(rem, orig)) {
		transformed.position += confirmed.position;
		return transformed;
	}

	const newPath = [...orig];

	// 1) Only shift root-level siblings when the merge happened at root
	if (rem.length === 1 && newPath.length > 0 && newPath[0] > rem[0]) {
		newPath[0] = newPath[0] - 1;
	}

	// 2) Nested sibling shift at the merge’s parent level
	if (rem.length > 1) {
		const depth = rem.length - 1;
		const prefix = rem.slice(0, depth);
		if (
			newPath.length > depth &&
			Path.equals(prefix, newPath.slice(0, depth)) &&
			newPath[depth] > rem[depth]
		) {
			newPath[depth] = newPath[depth] - 1;
		}
	}

	transformed.path = newPath;
	return transformed;
}
