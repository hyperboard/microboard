import type { AINode, AINodeData } from "./AINode";
import type { AudioItem, AudioItemData } from "./Audio";
import type { Comment, CommentData } from "./Comment";
import type { Connector, ConnectorData } from "./Connector";
import type { Drawing, DrawingData } from "./Drawing";
import type { Frame, FrameData } from "./Frame";
import type { Group, GroupData } from "./Group";
import type { ImageItem, ImageItemData } from "./Image";
import type { Placeholder, PlaceholderData } from "./Placeholder";
import type { RichText, RichTextData } from "./RichText";
import type { Shape, ShapeData } from "./Shape";
import type { Sticker } from "./Sticker";
import type { StickerData } from "./Sticker/StickerOperation";
import type { VideoItem, VideoItemData } from "./Video";
import type { BaseItem, SerializedItemData } from "Items/BaseItem/BaseItem";

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
  | AudioItem
  | BaseItem;

export type ItemType =
  | "RichText"
  | "Shape"
  | "Connector"
  | "Image"
  | "ImageItem"
  | "Drawing"
  | "Sticker"
  | "Frame"
  | "Placeholder"
  | "Comment"
  | "Group"
  | "AINode"
  | "Video"
  | "VideoItem"
  | "Audio"
  | "AudioItem"
  | "BaseItem"
  | "Eraser"
  | "Card"
  | "Deck"
  | "Dice"
  | "Star"
  | (string & {});
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
  | AudioItemData
  | SerializedItemData;

export type ItemDataWithId = ItemData  & { id: string }
