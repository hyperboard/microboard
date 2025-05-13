import { TransformationOperation } from "../Transformation";

export function handleUpdate(
	op: TransformationOperation,
	text: {
		getId: () => string;
		transformCanvas: () => void;
		handleInshapeScale: () => void;
		updateElement: () => void;
	},
): void {
	if (op.method === "translateTo" || op.method === "translateBy") {
		text.transformCanvas();
	} else if (op.method === "transformMany") {
		const currItemOp = op.items[text.getId()];
		if (
			currItemOp.method === "translateBy" ||
			currItemOp.method === "translateTo"
		) {
			text.transformCanvas();
		} else if (currItemOp.method === "scaleByTranslateBy") {
			if (currItemOp.scale.x === 1 && currItemOp.scale.y === 1) {
				text.transformCanvas();
			} else if (currItemOp.scale.x !== currItemOp.scale.y) {
				// Для неоднородного масштабирования (x ≠ y)
				text.handleInshapeScale();
			} else {
				// Для однородного масштабирования (x = y ≠ 1)
				text.updateElement();
			}
		} else {
			text.handleInshapeScale();
		}
	} else {
		if (op.method === "scaleByTranslateBy") {
			text.handleInshapeScale();
		} else {
			text.updateElement();
		}
	}
}
