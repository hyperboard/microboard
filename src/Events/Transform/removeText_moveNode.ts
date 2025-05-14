/* eslint-disable @typescript-eslint/naming-convention */
import { RemoveTextOperation, MoveNodeOperation } from "slate";
import { transformPath } from "./transformPath";

export function removeText_moveNode(
	confirmed: RemoveTextOperation,
	toTransform: MoveNodeOperation,
): MoveNodeOperation {
	const transformed = { ...toTransform };

	transformPath(confirmed, transformed);
	return transformed;
}
