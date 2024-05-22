import { Connector, ConnectorData } from "./Connector";
import { Drawing, DrawingData } from "./Drawing";
import { Frame, FrameData } from "./Frame";
import { ImageItem, ImageItemData } from "./Image";
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
	| Frame;
export type ItemType = Item["itemType"];
export type ItemData =
	| ShapeData
	| RichTextData
	| ConnectorData
	| ImageItemData
	| DrawingData
	| StickerData
	| FrameData;
