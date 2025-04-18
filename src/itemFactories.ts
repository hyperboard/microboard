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
	Point,
	ItemType,
} from "./Items";
import { Item, ItemData } from "./Items";
import { ImageItem, ImageItemData } from "./Items/Image";
import { Drawing, DrawingData } from "./Items/Drawing";
import { Sticker } from "./Items/Sticker";
import { StickerData } from "./Items/Sticker/StickerOperation";
import { Board } from "./Board";
import { Placeholder, PlaceholderData } from "./Items/Placeholder/Placeholder";
import { Group, GroupData } from "./Items/Group";
import { Comment } from "./Items/Comment";
import { AINode } from "Board/Items/AINode/AINode";
import { AINodeData } from "Board/Items/AINode/AINodeData";
import { VideoItem, VideoItemData } from "Board/Items/Video/Video";
import { AudioItem, AudioItemData } from "Board/Items/Audio/Audio";

interface ItemFactory {
	(id: string, data: ItemData, board: Board): Item;
}

export type ItemFactories = Record<ItemType, ItemFactory>;
export const itemFactories: ItemFactories = {
	Sticker: createSticker,
	Shape: createShape,
	RichText: createRichText,
	Connector: createConnector,
	Image: createImage,
	Drawing: createDrawing,
	Frame: createFrame,
	Placeholder: createPlaceholder,
	Comment: createComment,
	Group: createGroup,
	AINode: createAINode,
	Video: createVideo,
	Audio: createAudio,
};

function createSticker(id: string, data: ItemData, board: Board): Sticker {
	if (!isStickerData(data)) {
		throw new Error("Invalid data for Sticker");
	}
	const sticker = new Sticker(board).setId(id).deserialize(data);
	return sticker;
}

function createComment(id: string, data: ItemData, board: Board): Comment {
	if (!isCommentData(data)) {
		throw new Error("Invalid data for Comment");
	}
	const comment = new Comment(new Point(), board.events)
		.setId(id)
		.deserialize(data);
	return comment;
}

function createAINode(id: string, data: ItemData, board: Board): AINode {
	if (!isAINodeData(data)) {
		throw new Error("Invalid data for AINode");
	}
	const nodeData = data as AINodeData;
	const node = new AINode(
		board,
		nodeData.isUserRequest,
		nodeData.parentNodeId,
		nodeData.contextItems,
	)
		.setId(id)
		.deserialize(data);
	return node;
}

function createShape(id: string, data: ItemData, board: Board): Shape {
	if (!isShapeData(data)) {
		throw new Error("Invalid data for Shape");
	}
	const shape = new Shape(board).setId(id).deserialize(data);
	return shape;
}

function createRichText(id: string, data: ItemData, board: Board): RichText {
	if (!isRichTextData(data)) {
		throw new Error("Invalid data for RichText");
	}
	const richText = new RichText(board, new Mbr(), id)
		.setId(id)
		.deserialize(data);
	return richText;
}

function createConnector(id: string, data: ItemData, board: Board): Connector {
	if (!isConnectorData(data)) {
		throw new Error("Invalid data for Connector");
	}
	const connector = new Connector(board).setId(id).deserialize(data);
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

function createVideo(id: string, data: ItemData, board: Board): VideoItem {
	if (!isVideoItemData(data)) {
		throw new Error("Invalid data for VideoItem");
	}
	const video = new VideoItem(data, board, board.events, id, data.extension)
		.setId(id)
		.deserialize(data);
	return video;
}

function createAudio(id: string, data: ItemData, board: Board): AudioItem {
	if (!isAudioItemData(data)) {
		throw new Error("Invalid data for AudioItem");
	}
	const audio = new AudioItem(
		board,
		data.isStorageUrl,
		data.url,
		board.events,
		id,
		data.extension,
	)
		.setId(id)
		.deserialize(data);
	return audio;
}

function createDrawing(id: string, data: ItemData, board: Board): Drawing {
	if (!isDrawingData(data)) {
		throw new Error("Invalid data for Drawing");
	}
	const drawing = new Drawing(board, [], board.events)
		.setId(id)
		.deserialize(data);
	return drawing;
}

function createFrame(id: string, data: ItemData, board: Board): Frame {
	if (!isFrameData(data)) {
		throw new Error("Invalid data for Drawing");
	}
	const frame = new Frame(board, board.items.getById.bind(board.items))
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

function createGroup(id: string, data: ItemData, board: Board): Group {
	if (!isGroupData(data)) {
		throw new Error("Invalid data for Group");
	}

	const group = new Group(board, board.events, data.children, "")
		.setId(id)
		.deserialize(data);

	return group;
}

function isStickerData(data: ItemData): data is StickerData {
	return data.itemType === "Sticker";
}

function isCommentData(data: ItemData): data is ItemData {
	return data.itemType === "Comment";
}

function isAINodeData(data: ItemData): data is ItemData {
	return data.itemType === "AINode";
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

function isVideoItemData(data: ItemData): data is VideoItemData {
	return data.itemType === "Video";
}

function isAudioItemData(data: ItemData): data is AudioItemData {
	return data.itemType === "Audio";
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

function isGroupData(data: ItemData): data is GroupData {
	return data.itemType === "Group";
}
