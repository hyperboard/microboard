import { Board } from 'Board';
import {
	Item,
	Connector,
	Shape,
	ItemData,
	ShapeData,
	RichText,
	Mbr,
	ThreadDirection,
	DefaultTransformationData
} from 'Items';
import { AINode } from 'Items/AINode';
import { ControlPointData, getControlPoint } from 'Items/Connector/ControlPoint';
import { getDirection } from 'Items/Connector/getLine/findOrthogonalPath';
import { ShapeType } from 'Items/Shape';
import { BasicShapes } from 'Items/Shape/Basic';
import { Sticker } from 'Items/Sticker';
import {threadDirections} from "../../Items/AINode/AINode";

/** index represents the number of connection - left, right, top, bottom */
export function getControlPointData(
	item: Item,
	index: number,
	isRichText = false
): ControlPointData {
	const itemScale = isRichText ? { x: 1, y: 1 } : item.transformation.getScale();
	const width = item.getPathMbr().getWidth();
	let height = item.getPathMbr().getHeight();
	const adjMapScaled: { [key: number]: { x: number; y: number } } = {
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
		pointType: 'Fixed',
		itemId: item.getId(),
		relativeX: adjMapScaled[index].x,
		relativeY: adjMapScaled[index].y,
	};
}

export function quickAddItem(
	board: Board,
	type: ShapeType | 'AINode' | 'Sticker' | 'RichText',
	connector: Connector
): void {
	const startPoint = connector.getStartPoint();
	const endPoint = connector.getEndPoint();
	const isShape = type in BasicShapes;
	let optionalItem: Item = new Shape(
		board,
		undefined,
		isShape ? (type as ShapeType) : 'Rectangle'
	);
	switch (type) {
		case 'RichText':
			optionalItem = createRichText(board);
			break;
		case 'Sticker':
			optionalItem = new Sticker(board);
			break;
		case 'AINode':
			optionalItem = createAINode(board, 3, "item" in startPoint ? startPoint?.item?.getId() : undefined);
			break;
	}

	let itemMbr = optionalItem.getMbr();
	if (startPoint.pointType !== 'Board') {
		if (type === 'Sticker' || isShape) {
			itemMbr = startPoint.item.getMbr();
		}
	}
	let itemData: ItemData = optionalItem.serialize();
	if (startPoint.pointType !== 'Board') {
		if (type === 'Sticker' || isShape) {
			const prevItemData = startPoint.item.serialize();
			if (prevItemData.itemType === 'Shape' && isShape) {
				itemData = {
					...prevItemData,
					shapeType: (itemData as ShapeData).shapeType,
				};
			} else if (type === 'Sticker' && prevItemData.itemType === 'Sticker') {
				itemData = prevItemData;
			}
		}
	}

	const guarded = itemData as Partial<ItemData>;
	if ('text' in guarded && guarded.itemType !== 'AINode' && guarded.itemType !== 'RichText') {
		delete guarded.text;
	}
	if (!itemData.transformation) {
		itemData.transformation = new DefaultTransformationData();
	}
	itemData.transformation.translateX = endPoint.x;
	itemData.transformation.translateY = endPoint.y;
	const lines = connector.lines.getSegments();
	const lastLine = lines[lines.length - 1];
	const lastLineStart = lastLine.getStartPoint();
	const lastLineEnd = lastLine.getEndPoint();
	let dir = getDirection(lastLineStart, lastLineEnd);
	const firstLineStart = lines[0].getEndPoint();
	if (!dir) {
		const xDiff = Math.abs(firstLineStart.x - lastLineEnd.x);
		const yDiff = Math.abs(firstLineStart.y - lastLineEnd.y);
		dir = xDiff > yDiff ? 'horizontal' : 'vertical';
	}

	let dirIndex = -1;
	if (dir === 'vertical') {
		if (firstLineStart.y > lastLineEnd.y) {
			// to bottom
			itemData.transformation.translateX -= itemMbr.getWidth() / 2;
			itemData.transformation.translateY -= itemMbr.getHeight();
			dirIndex = 3;
		} else {
			// to top
			itemData.transformation.translateX -= itemMbr.getWidth() / 2;
			dirIndex = 2;
		}
	} else if (dir === 'horizontal') {
		if (firstLineStart.x > lastLineEnd.x) {
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
		throw new Error('New item connection direction now found');
	}

	if (itemData.itemType === 'AINode') {
		const reverseIndexMap: { [key: number]: number } = { 0: 1, 1: 0, 2: 3, 3: 2 };
		itemData.threadDirection = reverseIndexMap[dirIndex];
	}

	const newItem = board.createItem('', itemData);
	const added = board.add(newItem);
	const pointData = getControlPointData(added, dirIndex, added.itemType === 'RichText');
	const newEndPoint = getControlPoint(pointData, itemId => board.items.findById(itemId));
	connector.setEndPoint(newEndPoint);
	board.selection.removeAll();
	board.selection.add(added);

	if (added instanceof RichText || added instanceof AINode) {
		const text = added.getRichText();
		text.editor.setMaxWidth(text.editor.maxWidth || 600);
		board.selection.editText();
	} else {
		board.selection.setContext('EditUnderPointer');
	}
}

export function createAINode(board: Board, directionIndex: number, parentNodeId?: string): AINode {
	const node = new AINode(board, true, parentNodeId, undefined, directionIndex as ThreadDirection);
	const nodeRichText = node.getRichText();
	nodeRichText.applyMaxWidth(600);
	nodeRichText.setSelectionHorisontalAlignment('left');
	nodeRichText.container.right = nodeRichText.container.left + 600;
	nodeRichText.placeholderText = 'Type your request...';
	return node;
}

export function createRichText(board: Board): RichText {
	const text = new RichText(board, new Mbr());
	text.applyMaxWidth(600);
	text.setSelectionHorisontalAlignment('left');
	return text;
}
