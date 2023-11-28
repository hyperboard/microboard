import { Connector, ConnectorData } from "./Connector";
import { Drawing, DrawingData } from "./Drawing";
import { ImageItem, ImageItemData } from "./Image";
import { RichText, RichTextData } from "./RichText";
import { Shape, ShapeData } from "./Shape";

export type Item = RichText | Shape | Connector | ImageItem | Drawing;
export type ItemType = Item["itemType"];
export type ItemData =
	| ShapeData
	| RichTextData
	| ConnectorData
	| ImageItemData
	| DrawingData;
