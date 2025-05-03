import { RemoveTextOperation, SplitNodeOperation, Path } from "slate";
import { transformPath } from "./transformPath";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeText_splitNode(
	confirmed: RemoveTextOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position -= confirmed.text.length;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}
