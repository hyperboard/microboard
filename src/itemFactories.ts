import {
	Mbr,
	Connector,
	RichText,
	Shape,
	ShapeData,
	RichTextData,
	ConnectorData,
	Frame,
} from "./Items";
import { Item, ItemData } from "./Items";
import { ImageItem, ImageItemData } from "./Items/Image";
import { Drawing, DrawingData } from "./Items/Drawing";
import { Sticker } from "./Items/Sticker";
import { StickerData } from "./Items/Sticker/StickerOperation";
import { Board } from "./Board";

interface ItemFactory {
	(id: string, data: ItemData, board: Board): Item;
}
interface ItemFactories {
	[key: string]: ItemFactory;
}
export const itemFactories: ItemFactories = {
	Sticker: createSticker,
	Shape: createShape,
	RichText: createRichText,
	Connector: createConnector,
	Image: createImage,
	Drawing: createDrawing,
	Frame: createFrame,
	// Group: createGroup, // Uncomment if needed
};

function createSticker(id: string, data: ItemData, board: Board): Sticker {
	if (!isStickerData(data)) {
		throw new Error("Invalid data for Sticker");
	}
	return new Sticker(board.events).setId(id).deserialize(data);
}

function createShape(id: string, data: ItemData, board: Board): Shape {
	if (!isShapeData(data)) {
		throw new Error("Invalid data for Shape");
	}
	return new Shape(board.events).setId(id).deserialize(data);
}

function createRichText(id: string, data: ItemData, board: Board): RichText {
	if (!isRichTextData(data)) {
		throw new Error("Invalid data for RichText");
	}
	return new RichText(new Mbr(), id, board.events)
		.setId(id)
		.deserialize(data);
}

function createConnector(id: string, data: ItemData, board: Board): Connector {
	if (!isConnectorData(data)) {
		throw new Error("Invalid data for Connector");
	}
	return new Connector(board, board.events).setId(id).deserialize(data);
}

function createImage(id: string, data: ItemData, board: Board): ImageItem {
	if (!isImageItemData(data)) {
		throw new Error("Invalid data for ImageItem");
	}
	return new ImageItem(data.dataUrl, board.events, id)
		.setId(id)
		.deserialize(data);
}

function createDrawing(id: string, data: ItemData, board: Board): Drawing {
	if (!isDrawingData(data)) {
		throw new Error("Invalid data for Drawing");
	}
	return new Drawing([]).setId(id).deserialize(data);
}

function createFrame(id: string, data: ItemData, board: Board): Frame {
	if (!isFrameData(data)) {
		throw new Error("Invalid data for Drawing");
	}
	return new Frame(board.events).setId(id).deserialize(data);
}

// function createGroup(id: string, data: ItemData, board: Board): Group {
//    if (!isGroupData(data)) throw new Error('Invalid data for Group');
//    return new Group(board.events).setId(id).deserialize(data);
// } // Uncomment if needed

function isStickerData(data: ItemData): data is StickerData {
	return data.itemType === "Sticker";
}

function isShapeData(data: ItemData): data is ShapeData {
	return data.itemType === "Shape";
}

function isRichTextData(data: ItemData): data is RichTextData {
	return data.itemType === "RichText";
}

function isConnectorData(data: ItemData): data is ConnectorData {
	return data.itemType === "Connector";
}

function isImageItemData(data: ItemData): data is ImageItemData {
	return data.itemType === "Image";
}

function isDrawingData(data: ItemData): data is DrawingData {
	return data.itemType === "Drawing";
}

function isFrameData(data: ItemData): data is DrawingData {
	return data.itemType === "Frame";
}

// function isGroupData(data: ItemData): data is GroupData {
//     return data.itemType === 'Group';
// } // Uncomment if needed
