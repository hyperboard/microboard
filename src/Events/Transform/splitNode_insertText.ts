import { SplitNodeOperation, InsertTextOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function splitNode_insertText(
	confirmed: SplitNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	console.log("splitNode_insertText");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.position <= toTransform.offset) {
			transformed.offset -= confirmed.position;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}
