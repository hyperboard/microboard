import { MergeNodeOperation, RemoveTextOperation, Path } from "slate";
import { transformPath } from "./Transform";

export function mergeNode_removeText(
	confirmed: MergeNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	console.log("mergeNode_removeText");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		transformed.offset += confirmed.position;
	}
	transformPath(confirmed, transformed);
	return transformed;
}
