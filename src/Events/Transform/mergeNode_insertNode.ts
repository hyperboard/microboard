import { MergeNodeOperation, InsertNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function mergeNode_insertNode(
	confirmed: MergeNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	const isDescendant = Path.isAncestor(confirmed.path, transformed.path);
	const isAfter = Path.isBefore(confirmed.path, transformed.path);

	if (
		(confirmed.path.length === 1 && isAfter && !isDescendant) ||
		(confirmed.path.length > 1 && (isAfter || isDescendant))
	) {
		transformPath(confirmed, transformed);
	}

	return transformed;
}
