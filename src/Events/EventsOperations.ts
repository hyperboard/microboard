import { TransformationOperation } from "../Items";
import { ShapeOperation } from "../Items/Shape";
import { RichTextOperation } from "../Items";
import { BoardOperation } from "../BoardOperations";
import { ConnectorOperation } from "../Items/Connector";
import { DrawingOperation } from "Board/Items/Drawing/DrawingCommand";
import { StickerOperation } from "../Items/Sticker/StickerOperation";
import { FrameOperation } from "../Items/Frame";

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
	| TransformationOperation
	| ShapeOperation
	| StickerOperation
	| RichTextOperation
	| ConnectorOperation
	| DrawingOperation
	| FrameOperation;

export type UndoableOperation = BoardOperation | ItemOperation;

export type Operation = UndoableOperation | EventsOperation;
