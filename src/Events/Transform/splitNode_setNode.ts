import { SplitNodeOperation, SetNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function splitNode_setNode(
	confirmed: SplitNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	console.log("splitNode_setNode");
	const transformed = { ...toTransform };
	// todo adjust the path to apply set_node to both resulting nodes
	// or add new set_node to set prev node to prev node
	// if (Path.equals(confirmed.path, toTransform.path)) {
	// }
	transformPath(confirmed, transformed);
	return transformed;
}
