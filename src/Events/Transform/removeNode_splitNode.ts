import { RemoveNodeOperation, SplitNodeOperation } from "slate";
import { transformPath } from "./transformPath";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeNode_splitNode(
	confirmed: RemoveNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
