import { Board } from "Board";
import { Connector, Item, Shape, ShapeData } from "Board/Items";
import {
	ControlPointData,
	getControlPoint,
} from "Board/Items/Connector/ControlPoint";
import { getDirection } from "Board/Items/Connector/getLine/findOrthogonalPath";
import { ShapeType } from "Board/Items/Shape/Basic";

/** index represents the number of connection - left, right, top, bottom */
export function getControlPointData(
	item: Item,
	index: number,
): ControlPointData {
	const itemScale = item.transformation.getScale();
	const width = item.getMbr().getWidth();
	const height = item.getMbr().getHeight();
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
		relativeX:
			item.itemType === "Shape"
				? adjMapScaled[index].x
				: adjMapScaled[index].x / 2,
		relativeY:
			item.itemType === "Shape"
				? adjMapScaled[index].y
				: adjMapScaled[index].y / 2,
	};
}

export function quickAddItem(
	board: Board,
	type: "copy" | ShapeType,
	connector: Connector,
): void {
	const optionalShape = new Shape(
		undefined,
		undefined,
		type !== "copy" ? type : "Rectangle",
	);
	const startPoint = connector.getStartPoint();
	const endPoint = connector.getEndPoint();

	const itemMbr =
		type === "copy" && startPoint.pointType !== "Board"
			? startPoint.item.getMbr()
			: optionalShape.getMbr();
	const itemData: ShapeData =
		type === "copy" && startPoint.pointType !== "Board"
			? startPoint.item.serialize()
			: optionalShape.serialize();
	delete itemData.text;
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

	const newItem = board.createItem("", itemData);
	const added = board.add(newItem);
	const pointData = getControlPointData(added, dirIndex);
	const newEndPoint = getControlPoint(pointData, itemId =>
		board.items.findById(itemId),
	);
	connector.setEndPoint(newEndPoint);
	board.selection.removeAll();
	board.selection.add(added);
	board.selection.setContext("EditUnderPointer");
}
