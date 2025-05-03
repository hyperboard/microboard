import { SetNodeOperation, SplitNodeOperation } from "slate";
import { transformPath } from "./Transform";

export function setNode_splitNode(
	confirmed: SetNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	console.log("setNode_splitNode");
	const transformed = { ...toTransform };
	transformed.properties = {
		...transformed.properties,
		...confirmed.newProperties,
	};
	transformPath(confirmed, transformed);
	return transformed;
}
