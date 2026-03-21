import type {TransformationOperation} from "../Items/Transformation/TransformationOperations";
import type {ShapeOperation} from "../Items/Shape/ShapeOperation";
import type {RichTextOperation} from "../Items/RichText/RichTextOperations";
import type {BoardOps} from "../BoardOperations";
import type {ConnectorOperation} from "../Items/Connector/ConnectorOperations";
import type {DrawingOperation} from "../Items/Drawing/DrawingOperation";
import type {StickerOperation} from "../Items/Sticker/StickerOperation";
import type {FrameOperation} from "../Items/Frame/FrameOperation";
import type {LinkToOperation} from "../Items/LinkTo/LinkToOperation";
import type {PlaceholderOperation} from "../Items/Placeholder/PlaceholderOperation";
import type {GroupOperation} from "../Items/Group/GroupOperation";
import type {CommentOperation} from "../Items/Comment/CommentOperation";
import type {ImageOperation} from "../Items/Image/ImageOperation";
import type {VideoOperation} from "../Items/Video/VideoOperation";
import type {AudioOperation} from "../Items/Audio/AudioOperation";

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

export function isTransformation(op: Operation): op is TransformationOperation {
    return op.class === "Transformation";
}

export function isBoardOp(op: Operation): op is BoardOps {
    return op.class === "Board";
}

export function isRichTextOp(op: Operation): op is RichTextOperation {
    return op.class === "RichText";
}

export function isShapeOp(op: Operation): op is ShapeOperation {
    return op.class === "Shape";
}

export function isConnectorOp(op: Operation): op is ConnectorOperation {
    return op.class === "Connector";
}

export function isDrawingOp(op: Operation): op is DrawingOperation {
    return op.class === "Drawing";
}

export function isItemOp(op: Operation): op is ItemOperation {
    return !isBoardOp(op) && !isEventsOp(op);
}

export function isEventsOp(op: Operation): op is EventsOperation {
    return op.class === "Events";
}
