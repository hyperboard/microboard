import { SplitNodeOperation, InsertTextOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_insertText(
	confirmed: SplitNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	const confPath = confirmed.path;
	const tPath = transformed.path;

	// If it's the same node, only adjust the offset and skip path transforms
	if (Path.equals(confPath, tPath)) {
		if (confirmed.position <= transformed.offset) {
			transformed.offset -= confirmed.position;
		}
		return transformed;
	}

	// Otherwise apply path shifting for siblings/descendants
	transformPath(confirmed, transformed);
	return transformed;
}
