import { RemoveTextOperation, SplitNodeOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function removeText_splitNode(
	confirmed: RemoveTextOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	console.log("removeText_splitNode");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position -= confirmed.text.length;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}
