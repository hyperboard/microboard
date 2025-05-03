import { Path } from "slate";
import { SlateOpsToTransform } from "./Transform";

export function transformPath(
	confirmed: SlateOpsToTransform,
	toTransform: SlateOpsToTransform,
): void {
	const newPath = Path.transform(toTransform.path, confirmed);
	if (newPath) {
		toTransform.path = newPath;
	}
}
