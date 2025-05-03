import { RemoveTextOperation, Path } from "slate";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function removeText_removeText(
	confirmed: RemoveTextOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };

	if (Path.equals(confirmed.path, toTransform.path)) {
		const confirmedStart = confirmed.offset;
		const confirmedEnd = confirmed.offset + confirmed.text.length;
		const toTransformStart = toTransform.offset;
		const toTransformEnd = toTransform.offset + toTransform.text.length;

		// Adjust offset for operations that come after the confirmed removal
		if (confirmedEnd <= toTransformStart) {
			transformed.offset = toTransformStart - confirmed.text.length;
			return transformed;
		}

		// Completely outside range (confirmed comes AFTER to-transform)
		if (confirmedStart >= toTransformEnd) {
			return transformed;
		}

		// Handle cases where confirmed operation overlaps with to-transform operation
		if (confirmedStart <= toTransformStart) {
			// Confirmed operation starts before or at the same point as to-transform
			const overlap = Math.max(0, confirmedEnd - toTransformStart);
			transformed.text = toTransform.text.slice(overlap);
			transformed.offset = toTransformStart;
		} else if (confirmedStart < toTransformEnd) {
			// Confirmed operation starts within the to-transform text
			const startSlice = confirmedStart - toTransformStart;
			const endSlice = toTransformEnd - confirmedEnd;

			if (startSlice >= 0 && endSlice >= 0) {
				transformed.text =
					toTransform.text.slice(0, startSlice) +
					toTransform.text.slice(startSlice + confirmed.text.length);
				transformed.offset = toTransformStart;
			}
		}
	}

	return transformed;
}
