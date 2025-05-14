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

	if ("newPath" in toTransform) {
		const newPathUpdated = Path.transform(toTransform.newPath, confirmed);
		if (newPathUpdated) {
			toTransform.newPath = newPathUpdated;
		}
	}
}

export function basicTransformPath<
	T extends SlateOpsToTransform,
	U extends SlateOpsToTransform,
>(confirmed: T, toTransform: U): U {
	const transformed = { ...toTransform };

	transformPath(confirmed, transformed);
	return transformed;
}
