import { SplitNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function splitNode_splitNode(
	confirmed: SplitNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	console.log("splitNode_splitNode");
	const transformed = { ...toTransform };
	// todo fix
	// if (Path.equals(confirmed.path, toTransform.path)) {
	// 	if (confirmed.position <= toTransform.position) {
	// 		transformed.position -= confirmed.position;
	// 	}
	// }
	transformPath(confirmed, transformed);
	return transformed;
}
