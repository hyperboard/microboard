import { Matrix } from "Board/Items/Transformation/Matrix";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { Item } from "Board/Items/Item";
import {
	ScaleByTranslateByOperation,
	ScaleOperation,
	TransformManyItems,
	TranslateOperation,
} from "Board/Items/Transformation/TransformationOperations";
import { RichText } from "Board/Items/RichText/RichText";
import { AINode } from "Board/Items/AINode/AINode";
import { Sticker } from "Board/Items/Sticker/Sticker";
import { Board } from "Board/Board";

export function handleMultipleItemsResize({
	board,
	resize,
	itemsToResize,
	isHeight,
	isWidth,
	initMbr,
	isShiftPressed,
}: {
	board: Board;
	resize: { matrix: Matrix; mbr: Mbr };
	initMbr: Mbr;
	isWidth: boolean;
	isHeight: boolean;
	isShiftPressed: boolean;
	itemsToResize?: Item[];
}): TransformManyItems {
	const { matrix } = resize;
	const translation: TransformManyItems = {};
	const items = itemsToResize ? itemsToResize : board.selection.items.list();
	board.items.getComments().forEach(comment => {
		if (items.some(item => item.getId() === comment.getItemToFollow())) {
			items.push(comment);
		}
	});

	for (const item of items) {
		let itemX = item.getMbr().left;
		let itemY = item.getMbr().top;

		if (item.itemType === "Drawing") {
			itemX = item.transformation.matrix.translateX;
			itemY = item.transformation.matrix.translateY;
		}

		const deltaX = itemX - initMbr.left;
		const translateX = deltaX * matrix.scaleX - deltaX + matrix.translateX;
		const deltaY = itemY - initMbr.top;
		const translateY = deltaY * matrix.scaleY - deltaY + matrix.translateY;

		if (item instanceof RichText) {
			translation[item.getId()] = getRichTextTranslation({
				item,
				isWidth,
				isHeight,
				matrix,
				translateX,
				translateY,
			});
		} else if (item instanceof AINode) {
			translation[item.getId()] = getAINodeTranslation({
				item,
				isWidth,
				isHeight,
				matrix,
				translateX,
				translateY,
			});
		} else {
			translation[item.getId()] = getItemTranslation({
				item,
				isWidth,
				isHeight,
				matrix,
				translateX,
				translateY,
				isShiftPressed,
			});
		}
	}

	return translation;
}

function getRichTextTranslation({
	item,
	isWidth,
	isHeight,
	matrix,
	translateX,
	translateY,
}: {
	isWidth: boolean;
	isHeight: boolean;
	item: RichText;
	matrix: Matrix;
	translateX: number;
	translateY: number;
}): ScaleByTranslateByOperation | ScaleOperation | TranslateOperation {
	if (isWidth) {
		item.editor.setMaxWidth(
			(item.getWidth() / item.transformation.getScale().x) *
				matrix.scaleX,
		);
		return {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [item.getId()],
			translate: { x: matrix.translateX, y: 0 },
			scale: { x: matrix.scaleX, y: matrix.scaleX },
		};
	} else if (isHeight) {
		return {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [item.getId()],
			translate: { x: translateX, y: translateY },
			scale: { x: 1, y: 1 },
		};
	} else {
		return {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [item.getId()],
			translate: { x: translateX, y: translateY },
			scale: { x: matrix.scaleX, y: matrix.scaleX },
		};
	}
}

function getAINodeTranslation({
	item,
	isWidth,
	isHeight,
	matrix,
	translateX,
	translateY,
}: {
	isWidth: boolean;
	isHeight: boolean;
	item: AINode;
	matrix: Matrix;
	translateX: number;
	translateY: number;
}): ScaleByTranslateByOperation | ScaleOperation | TranslateOperation {
	if (isWidth) {
		item.text.editor.setMaxWidth(
			(item.text.getWidth() / item.transformation.getScale().x) *
				matrix.scaleX,
		);
		return {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [item.getId()],
			translate: { x: matrix.translateX, y: 0 },
			scale: { x: matrix.scaleX, y: matrix.scaleX },
		};
	} else if (isHeight) {
		return {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [item.getId()],
			translate: { x: translateX, y: translateY },
			scale: { x: 1, y: 1 },
		};
	} else {
		return {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [item.getId()],
			translate: { x: translateX, y: translateY },
			scale: { x: matrix.scaleX, y: matrix.scaleX },
		};
	}
}

function getItemTranslation({
	item,
	isWidth,
	isHeight,
	matrix,
	translateX,
	translateY,
	isShiftPressed,
}: {
	isWidth: boolean;
	isHeight: boolean;
	item: Item;
	matrix: Matrix;
	translateX: number;
	translateY: number;
	isShiftPressed: boolean;
}): ScaleByTranslateByOperation | ScaleOperation | TranslateOperation {
	if (item instanceof Sticker && (isWidth || isHeight)) {
		return {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [item.getId()],
			translate: { x: translateX, y: translateY },
			scale: { x: 1, y: 1 },
		};
	} else {
		if (
			item.itemType === "Frame" &&
			item.getCanChangeRatio() &&
			isShiftPressed &&
			item.getFrameType() !== "Custom"
		) {
			item.setFrameType("Custom");
		}
		return {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [item.getId()],
			translate: { x: translateX, y: translateY },
			scale: { x: matrix.scaleX, y: matrix.scaleY },
		};
	}
}
