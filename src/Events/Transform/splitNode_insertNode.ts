import { SplitNodeOperation, InsertNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_insertNode(
	confirmed: SplitNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	const conf = confirmed.path;
	const path = transformed.path;

	// 1) Same node: no change
	if (Path.equals(conf, path)) {
		return transformed;
	}

	// 2) Descendant of the split: bump its first (root-level) segment
	const isDescendant =
		path.length > conf.length &&
		path.slice(0, conf.length).every((seg, i) => seg === conf[i]);

	if (isDescendant) {
		const newPath = [...path];
		newPath[0] = newPath[0] + 1;
		transformed.path = newPath;
		return transformed;
	}

	// 3) Otherwise, shift siblings via generic transform
	if (Path.isBefore(conf, path)) {
		transformPath(confirmed, transformed);
	}

	return transformed;
}
