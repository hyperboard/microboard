import { SplitNodeOperation, RemoveNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_removeNode(
	confirmed: SplitNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	console.log("splitNode_removeNode");
	const transformed = { ...toTransform };
	const conf = confirmed.path;
	const path = transformed.path;

	// 1) Same node: no change
	if (Path.equals(conf, path)) {
		return transformed;
	}

	// 2) Immediate child of split
	if (
		path.length === conf.length + 1 &&
		path.slice(0, conf.length).every((seg, i) => seg === conf[i])
	) {
		const newPath = [...path];
		// root-level split: bump parent index
		if (conf.length === 1) {
			newPath[0] = newPath[0] + 1;
		} else {
			// nested split: bump child index
			newPath[conf.length] = newPath[conf.length] + 1;
		}
		transformed.path = newPath;
		return transformed;
	}

	// 3) Siblings and other branches
	const isDescendant =
		path.length > conf.length &&
		path.slice(0, conf.length).every((seg, i) => seg === conf[i]);
	if (Path.isBefore(conf, path) && !isDescendant) {
		transformPath(confirmed, transformed);
	}

	return transformed;
}
