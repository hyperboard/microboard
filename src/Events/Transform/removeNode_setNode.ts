import { RemoveNodeOperation, SetNodeOperation, Path } from "slate";
import { undefined, transformPath } from "./Transform";

export function removeNode_setNode(
	confirmed: RemoveNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation | undefined {
	console.log("removeNode_setNode");
	if (Path.equals(confirmed.path, toTransform.path)) {
		return undefined;
	}
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
