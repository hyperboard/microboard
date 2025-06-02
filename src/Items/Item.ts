import { AINode, AINodeData } from './AINode';
import { AudioItem, AudioItemData } from './Audio';
import { Comment, CommentData } from './Comment';
import { Connector, ConnectorData } from './Connector';
import { Drawing, DrawingData } from './Drawing';
import { Frame, FrameData } from './Frame';
import { Group, GroupData } from './Group';
import { ImageItem, ImageItemData } from './Image';
import { Placeholder, PlaceholderData } from './Placeholder';
import { RichText, RichTextData } from './RichText';
import { Shape, ShapeData } from './Shape';
import { Sticker } from './Sticker';
import { StickerData } from './Sticker/StickerOperation';
import { VideoItem, VideoItemData } from './Video';

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
	| Comment;

export type ItemType = Item['itemType'];
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
