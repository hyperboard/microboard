import { TransformationOperation } from "../Items";
import { ShapeOperation } from "../Items/Shape";
import { RichTextOperation } from "../Items";
import { BoardOps } from "../BoardOperations";
import { ConnectorOperation } from "../Items/Connector";
import { DrawingOperation } from "Board/Items/Drawing/DrawingOperation";
import { StickerOperation } from "../Items/Sticker/StickerOperation";
import { FrameOperation } from "../Items/Frame";
import { LinkToOperation } from "../Items/LinkTo/LinkToOperation";
import { PlaceholderOperation } from "Board/Items/Placeholder/PlaceholderOperation";
import { GroupOperation } from "Board/Items/Group/GroupOperation";
import { CommentOperation } from "../Items/Comment";
import { ImageOperation } from "Board/Items/Image";
import { VideoOperation } from "Board/Items/Video/VideoOperation";
import { AudioOperation } from "Board/Items/Audio/AudioOperation";

interface Undo {
	class: "Events";
	method: "undo";
	eventId: string;
}

interface Redo {
	class: "Events";
	method: "redo";
	eventId: string;
}

export type EventsOperation = Undo | Redo;

export type ItemOperation =
	| LinkToOperation
	| TransformationOperation
	| ShapeOperation
	| StickerOperation
	| RichTextOperation
	| ConnectorOperation
	| DrawingOperation
	| FrameOperation
	| PlaceholderOperation
	| GroupOperation
	| CommentOperation
	| ImageOperation
	| VideoOperation
	| AudioOperation;

export type UndoableOperation = BoardOps | ItemOperation;

export type Operation = UndoableOperation | EventsOperation;

export type MethodType = Operation["method"];
