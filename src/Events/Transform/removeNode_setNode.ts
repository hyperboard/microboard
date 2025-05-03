import { RemoveNodeOperation, SetNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeNode_setNode(
	confirmed: RemoveNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation | undefined {
	if (Path.equals(confirmed.path, toTransform.path)) {
		return undefined;
	}
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
