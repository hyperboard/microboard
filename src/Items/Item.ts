import { Connector, ConnectorData } from "./Connector";
import { Drawing, DrawingData } from "./Drawing";
import { Frame, FrameData } from "./Frame";
import { Group } from "./Group";
import { GroupData } from "./Group/GroupOperation";
import { ImageItem, ImageItemData } from "./Image";
import { Placeholder, PlaceholderData } from "./Placeholder/Placeholder";
import { RichText, RichTextData } from "./RichText";
import { Shape, ShapeData } from "./Shape";
import { Sticker } from "./Sticker";
import { StickerData } from "./Sticker/StickerOperation";

export type Item =
	| RichText
	| Shape
	| Connector
	| ImageItem
	| Drawing
	| Sticker
	| Frame
	| Placeholder
	| Group;

export type ItemType = Item["itemType"];
export type ItemData =
	| ShapeData
	| RichTextData
	| ConnectorData
	| ImageItemData
	| DrawingData
	| StickerData
	| FrameData
	| PlaceholderData
	| GroupData;
