import { SplitNodeOperation, RemoveTextOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_removeText(
	confirmed: SplitNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	// Clone to avoid mutating the original operation
	const transformed = { ...toTransform };

	// If it's the same node, only adjust the offset
	if (Path.equals(confirmed.path, transformed.path)) {
		if (confirmed.position <= transformed.offset) {
			transformed.offset -= confirmed.position;
		}
		// Do not shift the path in this case
	} else {
		const confPath = confirmed.path;
		const tPath = transformed.path;

		// Descendant of a root-level split: bump the first index
		const isRootLevelDescendant =
			confPath.length === 1 &&
			tPath.length > 1 &&
			tPath[0] === confPath[0];

		// Descendant of a deeper split: do not shift path
		const isDeeperAncestor =
			confPath.length > 1 &&
			tPath.length > confPath.length &&
			tPath
				.slice(0, confPath.length)
				.every((seg, i) => seg === confPath[i]);

		if (isRootLevelDescendant) {
			transformed.path = [tPath[0] + 1, ...tPath.slice(1)];
		} else if (!isDeeperAncestor) {
			// All other cases: apply generic path transformation
			transformPath(confirmed, transformed);
		}
	}

	return transformed;
}
