import { RemoveTextOperation, RemoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeText_removeNode(
	confirmed: RemoveTextOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}
