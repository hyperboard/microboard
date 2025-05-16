import { SplitNodeOperation, InsertTextOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_insertText(
	confirmed: SplitNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	const confPath = confirmed.path;
	const tPath = transformed.path;

	if (Path.equals(confPath, tPath)) {
		if (transformed.offset >= confirmed.position) {
			transformed.offset -= confirmed.position;
			// route into the new node:
			transformed.path = [...confPath];
			transformed.path[confPath.length - 1]! += 1;
		}
		return transformed;
	}

	// Otherwise apply path shifting for siblings/descendants
	transformPath(confirmed, transformed);
	return transformed;
}
