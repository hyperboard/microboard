import {
	Mbr,
	Connector,
	RichText,
	Shape,
	ShapeData,
	RichTextData,
	ConnectorData,
	Frame,
	FrameData,
} from "./Items";
import { Item, ItemData } from "./Items";
import { ImageItem, ImageItemData } from "./Items/Image";
import { Drawing, DrawingData } from "./Items/Drawing";
import { Sticker } from "./Items/Sticker";
import { StickerData } from "./Items/Sticker/StickerOperation";
import { Board } from "./Board";
import { Placeholder, PlaceholderData } from "./Items/Placeholder/Placeholder";

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
	Placeholder: createPlaceholder,
	// Group: createGroup, // Uncomment if needed
};

function createSticker(id: string, data: ItemData, board: Board): Sticker {
	if (!isStickerData(data)) {
		throw new Error("Invalid data for Sticker");
	}
	const sticker = new Sticker(board.events).setId(id).deserialize(data);
	return sticker;
}

function createShape(id: string, data: ItemData, board: Board): Shape {
	if (!isShapeData(data)) {
		throw new Error("Invalid data for Shape");
	}
	const shape = new Shape(board.events).setId(id).deserialize(data);
	return shape;
}

// async function createRichText(id: string, data: ItemData, board: Board): Promise<RichText> {
function createRichText(id: string, data: ItemData, board: Board): RichText {
	if (!isRichTextData(data)) {
		throw new Error("Invalid data for RichText");
	}
	const richText = new RichText(new Mbr(), id, board.events)
		.setId(id)
		.deserialize(data);
	// await richText.deserialize(data);
	return richText;
}

function createConnector(id: string, data: ItemData, board: Board): Connector {
	if (!isConnectorData(data)) {
		throw new Error("Invalid data for Connector");
	}
	const connector = new Connector(board, board.events)
		.setId(id)
		.deserialize(data);
	return connector;
}

function createImage(id: string, data: ItemData, board: Board): ImageItem {
	if (!isImageItemData(data)) {
		throw new Error("Invalid data for ImageItem");
	}
	const image = new ImageItem(data, board, board.events, id)
		.setId(id)
		.deserialize(data);
	return image;
}

function createDrawing(id: string, data: ItemData, board: Board): Drawing {
	if (!isDrawingData(data)) {
		throw new Error("Invalid data for Drawing");
	}
	const drawing = new Drawing([], board.events).setId(id).deserialize(data);
	return drawing;
}

function createFrame(id: string, data: ItemData, board: Board): Frame {
	if (!isFrameData(data)) {
		throw new Error("Invalid data for Drawing");
	}
	const frame = new Frame(board.events)
		.setId(id)
		.setBoard(board)
		.deserialize(data);
	return frame;
}

function createPlaceholder(
	id: string,
	data: ItemData,
	board: Board,
): Placeholder {
	if (!isPlaceholderData(data)) {
		throw new Error("Invalid data for Placeholder");
	}
	const placeholder = new Placeholder(board.events, data.miroData)
		.setId(id)
		.deserialize(data);

	return placeholder;
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

function isFrameData(data: ItemData): data is FrameData {
	return data.itemType === "Frame";
}

function isPlaceholderData(data: ItemData): data is PlaceholderData {
	return data.itemType === "Placeholder";
}

// function isGroupData(data: ItemData): data is GroupData {
//     return data.itemType === 'Group';
// } // Uncomment if needed
