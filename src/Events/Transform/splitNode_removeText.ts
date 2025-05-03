import { SplitNodeOperation, RemoveTextOperation, Path } from "slate";
import { transformPath } from "./transformPath";

export function splitNode_removeText(
	confirmed: SplitNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	console.log("splitNode_removeText");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.position <= toTransform.offset) {
			transformed.offset -= confirmed.position;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}
