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
import { Comment, CommentData } from "./Comment";
import { AINode } from "Board/Items/AINode/AINode";
import { AINodeData } from "Board/Items/AINode/AINodeData";
import { VideoItem, VideoItemData } from "Board/Items/Video/Video";
import { AudioItem, AudioItemData } from "Board/Items/Audio/Audio";

export type Item =
	| RichText
	| Shape
	| Connector
	| ImageItem
	| Drawing
	| Sticker
	| Frame
	| Placeholder
	| Comment
	| Group
	| AINode
	| VideoItem
	| AudioItem;

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
	| CommentData
	| GroupData
	| AINodeData
	| VideoItemData
	| AudioItemData;
