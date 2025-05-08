import { SetNodeOperation, SplitNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function setNode_splitNode(
	confirmed: SetNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	transformed.properties = {
		...transformed.properties,
		...confirmed.newProperties,
	};
	transformPath(confirmed, transformed);
	return transformed;
}
