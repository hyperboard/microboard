import { Board } from "Board";
import {
	Connector,
	Item,
	ItemData,
	Mbr,
	RichText,
	Shape,
	ShapeData,
} from "Board/Items";
import {
	ControlPointData,
	getControlPoint,
} from "Board/Items/Connector/ControlPoint";
import { getDirection } from "Board/Items/Connector/getLine/findOrthogonalPath";
import { ShapeType } from "Board/Items/Shape";
import { AINode } from "Board/Items/AINode/AINode";
import { BasicShapes } from "Board/Items/Shape/Basic/index";
import { Sticker } from "Board/Items/Sticker/Sticker";

/** index represents the number of connection - left, right, top, bottom */
export function getControlPointData(
	item: Item,
	index: number,
	isRichText = false,
): ControlPointData {
	const itemScale = isRichText
		? { x: 1, y: 1 }
		: item.transformation.getScale();
	const width =
		item.itemType === "Shape"
			? item.getPath().getMbr().getWidth()
			: item.getMbr().getWidth();
	let height: number;
	if (item.itemType === "Shape" && index !== 2 && index !== 3) {
		height = item.getPath().getMbr().getHeight();
	} else {
		height = item.getMbr().getHeight();
	}
	const adjMapScaled = {
		0: { x: 0, y: height / 2 / itemScale.y },
		1: {
			x: width / itemScale.x,
			y: height / 2 / itemScale.y,
		},
		2: { x: width / 2 / itemScale.x, y: 0 },
		3: {
			x: width / 2 / itemScale.x,
			y: height / itemScale.y,
		},
	};

	return {
		pointType: "Fixed",
		itemId: item.getId(),
		relativeX: adjMapScaled[index].x,
		relativeY: adjMapScaled[index].y,
	};
}

export function quickAddItem(
	board: Board,
	type: ShapeType | "AINode" | "Sticker" | "RichText",
	connector: Connector,
): void {
	const startPoint = connector.getStartPoint();
	const endPoint = connector.getEndPoint();
	const isShape = type in BasicShapes;
	let optionalItem: Item = new Shape(
		board,
		undefined,
		isShape ? (type as ShapeType) : "Rectangle",
	);
	switch (type) {
		case "RichText":
			optionalItem = createRichText(board);
			break;
		case "Sticker":
			optionalItem = new Sticker(board);
			break;
		case "AINode":
			optionalItem = createAINode(board, startPoint?.item?.getId(), 3);
			break;
	}

	let itemMbr = optionalItem.getMbr();
	if (startPoint.pointType !== "Board") {
		if (type === "Sticker" || isShape) {
			itemMbr = startPoint.item.getMbr();
		}
	}
	let itemData: ItemData = optionalItem.serialize();
	if (startPoint.pointType !== "Board") {
		if (type === "Sticker" || isShape) {
			const prevItemData = startPoint.item.serialize();
			if (prevItemData.itemType === "Shape" && isShape) {
				itemData = {
					...prevItemData,
					shapeType: (itemData as ShapeData).shapeType,
				};
			} else if (
				type === "Sticker" &&
				prevItemData.itemType === "Sticker"
			) {
				itemData = prevItemData;
			}
		}
	}

	const guarded = itemData as Partial<ItemData>;
	if (
		"text" in guarded &&
		guarded.itemType !== "AINode" &&
		guarded.itemType !== "RichText"
	) {
		delete guarded.text;
	}
	itemData.transformation.translateX = endPoint.x;
	itemData.transformation.translateY = endPoint.y;
	const lines = connector.lines.getSegments();
	const lastLine = lines[lines.length - 1];
	let dir = getDirection(lastLine.start, lastLine.end);
	if (!dir) {
		const firstLine = lines[0];
		const xDiff = Math.abs(firstLine.start.x - lastLine.end.x);
		const yDiff = Math.abs(firstLine.start.y - lastLine.end.y);
		dir = xDiff > yDiff ? "horizontal" : "vertical";
	}

	let dirIndex = -1;
	if (dir === "vertical") {
		if (lines[0].start.y > lastLine.end.y) {
			// to bottom
			itemData.transformation.translateX -= itemMbr.getWidth() / 2;
			itemData.transformation.translateY -= itemMbr.getHeight();
			dirIndex = 3;
		} else {
			// to top
			itemData.transformation.translateX -= itemMbr.getWidth() / 2;
			dirIndex = 2;
		}
	} else if (dir === "horizontal") {
		if (lines[0].start.x > lastLine.end.x) {
			// to right
			itemData.transformation.translateX -= itemMbr.getWidth();
			itemData.transformation.translateY -= itemMbr.getHeight() / 2;
			dirIndex = 1;
		} else {
			// to left
			itemData.transformation.translateY -= itemMbr.getHeight() / 2;
			dirIndex = 0;
		}
	} else {
		throw new Error("New item connection direction now found");
	}

	if (itemData.itemType === "AINode") {
		const reverseIndexMap = { 0: 1, 1: 0, 2: 3, 3: 2 };
		itemData.threadDirection = reverseIndexMap[dirIndex];
	}

	const newItem = board.createItem("", itemData);
	const added = board.add(newItem);
	const pointData = getControlPointData(
		added,
		dirIndex,
		added.itemType === "RichText",
	);
	const newEndPoint = getControlPoint(pointData, itemId =>
		board.items.findById(itemId),
	);
	connector.setEndPoint(newEndPoint);
	board.selection.removeAll();
	board.selection.add(added);

	if (added.itemType === "RichText" || added.itemType === "AINode") {
		const text = added.getRichText();
		text.editor.setMaxWidth(text.editor.maxWidth || 600);
		board.selection.editText();
	} else {
		board.selection.setContext("EditUnderPointer");
	}
}

export function createAINode(
	board: Board,
	parentNodeId: string,
	directionIndex: number,
): AINode {
	const node = new AINode(
		board,
		true,
		parentNodeId,
		undefined,
		directionIndex,
	);
	const nodeRichText = node.getRichText();
	nodeRichText.applyMaxWidth(600);
	nodeRichText.setSelectionHorisontalAlignment("left");
	nodeRichText.container.right = nodeRichText.container.left + 600;
	nodeRichText.placeholderText = "Type your request...";
	return node;
}

export function createRichText(board: Board): RichText {
	const text = new RichText(board, new Mbr());
	text.applyMaxWidth(600);
	text.setSelectionHorisontalAlignment("left");
	return text;
}
