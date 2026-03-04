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
	} else if (op.method === "applyMatrix") {
		const currItemOp = op.items.find(i => i.id === text.getId());
		if (!currItemOp) return;
		const { scaleX, scaleY } = currItemOp.matrix;
		if (scaleX === 1 && scaleY === 1) {
			text.transformCanvas();
		} else if (scaleX !== scaleY) {
			text.handleInshapeScale();
		} else {
			text.updateElement();
		}
	} else if (op.method === "transformMany") {
		const currItemOp = op.items[text.getId()];
		if (currItemOp.method === "translateBy" || currItemOp.method === "translateTo") {
			text.transformCanvas();
		} else if (currItemOp.method === "scaleByTranslateBy") {
			if (currItemOp.scale.x === 1 && currItemOp.scale.y === 1) {
				text.transformCanvas();
			} else if (currItemOp.scale.x !== currItemOp.scale.y) {
				text.handleInshapeScale();
			} else {
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
