import {TransformationOperation} from "../Items";
import {ShapeOperation} from "../Items/Shape";
import {RichTextOperation} from "../Items";
import {BoardOps} from "../BoardOperations";
import {ConnectorOperation} from "../Items/Connector";
import {DrawingOperation} from "Items/Drawing/DrawingOperation";
import {StickerOperation} from "../Items/Sticker/StickerOperation";
import {FrameOperation} from "../Items/Frame";
import {LinkToOperation} from "../Items/LinkTo/LinkToOperation";
import {PlaceholderOperation} from "Items/Placeholder/PlaceholderOperation";
import {GroupOperation} from "Items/Group/GroupOperation";
import {CommentOperation} from "../Items/Comment";
import {ImageOperation} from "Items/Image";
import {VideoOperation} from "Items/Video/VideoOperation";
import {AudioOperation} from "Items/Audio/AudioOperation";

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

export interface BaseOperation<T extends Record<string, unknown> = {}> {
    class: string;
    item: string[];
    method: string;
    newData: T;
    prevData?: T;
}

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
