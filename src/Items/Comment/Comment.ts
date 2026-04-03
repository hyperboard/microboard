import { Subject } from "Subject";
import type { Events, Operation } from "Events";
import { Point } from "Geometry/Point";
import { Transformation, TransformationData } from "Geometry/Transformation";
import { CommentOperation } from "./CommentOperation";
import { CommentCommand } from "./CommentCommand";
import { Mbr } from "Geometry/Mbr";
import { Geometry } from "Geometry/Geometry";
import { GeometricNormal } from "Geometry/GeometricNormal";
import { RichText } from "../RichText";
import { DrawingContext } from "Geometry/DrawingContext";
import { SerializedItemData } from "../BaseItem";
import { Line } from "Geometry/Line";
import { v4 as uuidv4 } from "uuid";
import { LinkTo } from "../LinkTo/LinkTo";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { transformOps } from "Geometry/Transformation/transformOps";
import { Board } from "Board";
import { Item } from "Items/Item";
import { registerItem } from "Items/RegisterItem";
import { CommentDataSchema } from "./Comment.schema";
import { DefaultTransformationData } from "Geometry/Transformation/TransformationData";

export interface Commentator {
  username: string;
  id: number;
  avatar?: string;
}

export interface Message {
  date: Date;
  text: string;
  id: string;
  commentator: Commentator;
  readers: number[];
}

export interface CommentData {
  readonly itemType: "Comment";
  anchor: Point;
  thread: Message[];
  commentators: Commentator[];
  transformation: TransformationData;
  usersUnreadMarks: number[];
  resolved: boolean;
  itemToFollow?: string;
  [key: string]: unknown;
}

const ANONYMOUS_ID = 9_999_999_999;

export class Comment extends BaseItem<Comment> {
  parent = "Board";
  private commentators: Commentator[] = [];
  private thread: Message[] = [];
  private usersUnreadMarks: number[] = [];
  private resolved = false;
  private itemToFollow?: string;
  private anchor = new Point();
  readonly subject = new Subject<Comment>();
  transformationRenderBlock?: boolean = undefined;
  resizeEnabled = true;

  constructor(
    board: Board,
    id = ""
  ) {
    super(board, id);
    this.linkTo.subject.subscribe(() => {
      this.subject.publish(this);
    });
  }

  serialize(): SerializedItemData<CommentData> {
    return {
      id: this.id,
      itemType: "Comment",
      anchor: this.anchor,
      thread: this.thread,
      commentators: this.commentators,
      transformation: this.transformation.serialize(),
      resolved: this.resolved,
      itemToFollow: this.itemToFollow,
      usersUnreadMarks: this.usersUnreadMarks,
    };
  }

  deserialize(data: SerializedItemData<CommentData> | CommentData): this {
    if (data.anchor) {
      this.anchor = new Point(data.anchor.x, data.anchor.y);
    }
    this.thread = data.thread;
    this.commentators = data.commentators;
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
      this.transform();
    }
    this.itemToFollow = data.itemToFollow;
    this.resolved = data.resolved;
    this.subject.publish(this);
    if (data.usersUnreadMarks) {
      this.usersUnreadMarks = data.usersUnreadMarks;
    } else {
      this.usersUnreadMarks = [];
    }
    return this;
  }

  public emit(operation: CommentOperation): void {
    if (this.board.events) {
      const command = new CommentCommand([this], operation);
      command.apply();
      this.board.events.emit(operation, command);
    } else {
      this.apply(operation);
    }
  }

  getItemToFollow(): string | undefined {
    return this.itemToFollow;
  }

  getMbrWithChildren(): Mbr {
    return this.getMbr();
  }

  setItemToFollow(itemId: string | undefined): void {
    this.emit({
      class: "Comment",
      method: "setItemToFollow",
      item: [this.id],
      itemId,
    });
  }

  setId(id: string): this {
    this.id = id;
    this.transformation.setId(id);
    return this;
  }

  getId(): string {
    return this.id;
  }

  getCommentators(): Commentator[] {
    return this.commentators;
  }

  apply(op: Operation): void {
    if (op.method === "setProperty") {
      super.apply(op);
      return;
    }
    switch (op.class) {
      case "Comment":
        this.applyCommentOperation(op as CommentOperation);
        this.transform();
        break;
      default:
        super.apply(op);
        break;
    }
    this.subject.publish(this);
  }

  private applyCommentOperation(op: CommentOperation): void {
    switch (op.method) {
      case "createMessage":
        this.thread = [...this.thread, op.message];
        if (
          !this.commentators.some((c) => c.id === op.message.commentator.id)
        ) {
          this.commentators = [...this.commentators, op.message.commentator];
        }
        break;
      case "editMessage":
        const thread = this.thread;
        const index = thread.findIndex((mes) => mes.id === op.message.id);
        this.thread = [
          ...thread.slice(0, index),
          { ...op.message },
          ...thread.slice(index + 1, thread.length),
        ];
        break;
      case "removeMessage":
        this.thread = this.thread.filter((mes) => mes.id !== op.messageId);
        break;
      case "setResolved":
        this.resolved = op.resolved;
        break;
      case "setItemToFollow":
        this.itemToFollow = op.itemId;
        break;
      case "markMessagesAsRead":
        this.applyReadMessages(op.messageIds, op.userId);
        break;
      case "markThreadAsUnread":
        this.usersUnreadMarks = [...this.usersUnreadMarks, op.userId];
        break;
      case "markThreadAsRead":
        this.usersUnreadMarks = this.usersUnreadMarks.filter(
          (userId) => userId !== op.userId
        );
        break;
    }
  }

  saveMessage(
    text: string,
    username: string,
    id: number,
    avatar?: string
  ): void {
    this.emit({
      class: "Comment",
      method: "createMessage",
      item: [this.id],
      message: {
        text,
        id: this.generateMessageId(),
        commentator: {
          username,
          id,
          avatar,
        },
        date: new Date(),
        readers: [id],
      },
    });
    if (this.getResolved()) {
      this.setResolved(false);
    }
  }

  editMessage(text: string, id: string): void {
    const message = this.getThread().find((mes) => mes.id === id);
    if (!message) {
      return;
    }
    const newMessage = { ...message };
    newMessage.text = text;
    newMessage.date = new Date();
    newMessage.readers = [message.readers[0]];
    this.emit({
      class: "Comment",
      method: "editMessage",
      item: [this.id],
      message: newMessage,
    });
    if (this.getResolved()) {
      this.setResolved(false);
    }
  }

  removeMessage(messageId: string): void {
    this.emit({
      class: "Comment",
      method: "removeMessage",
      item: [this.id],
      messageId,
    });
  }

  setResolved(resolved: boolean): void {
    this.emit({
      class: "Comment",
      method: "setResolved",
      item: [this.id],
      resolved,
    });
  }

  markThreadAsUnread(userId: number): void {
    this.emit({
      class: "Comment",
      method: "markThreadAsUnread",
      item: [this.id],
      userId,
    });
  }

  markThreadAsRead(userId: number): void {
    this.emit({
      class: "Comment",
      method: "markThreadAsRead",
      item: [this.id],
      userId,
    });
  }

  private _syncing = false;

  public transform(): void {
    if (this._syncing) return;
    this._syncing = true;
    const { translateX, translateY } = this.transformation.getMatrixData();
    if (translateX && translateY) {
      this.anchor = new Point(translateX, translateY);
    } else {
      this.apply(transformOps.setLocal(this.id, { translateX: this.anchor.x, translateY: this.anchor.y }));
    }
    this.setMbr(new Mbr(this.anchor.x, this.anchor.y, this.anchor.x, this.anchor.y));
    this._syncing = false;
  }

  getUnreadMessages(userId = ANONYMOUS_ID): Message[] | null {
    const unreadMessages = this.thread.filter(
      (mes) => mes && !mes.readers.includes(userId)
    );
    if (unreadMessages.length === 0) {
      return null;
    }
    return unreadMessages;
  }

  getIsThreadMarkedAsUnread(userId: number) {
    return this.usersUnreadMarks.some((id) => id === userId);
  }

  isClosed(): boolean {
    return false;
  }

  markMessagesAsRead(messageIds: string[], userId?: number): void {
    if (!userId) {
      return this.applyReadMessages(messageIds, ANONYMOUS_ID);
    }

    this.emit({
      class: "Comment",
      method: "markMessagesAsRead",
      item: [this.id],
      messageIds,
      userId,
    });
  }

  applyReadMessages(messageIds: string[], userId: number) {
    const readMessages = this.thread.filter((mes) =>
      messageIds.includes(mes.id)
    );
    readMessages.forEach((mes) => mes.readers.push(userId));
  }

  isInView(rect: Mbr): boolean {
    const anchor = this.anchor;
    return (
      anchor.x > rect.left &&
      anchor.x < rect.right &&
      anchor.y > rect.top &&
      anchor.y < rect.bottom
    );
  }

  getThread(): Message[] {
    return this.thread;
  }

  getResolved(): boolean {
    return this.resolved;
  }

  getDistanceToPoint(point: Point): number {
    return new Line(this.anchor, point).getLength();
  }

  getIntersectionPoints(segment: Line): Point[] {
    return [];
  }

  getAnchorPoint(): Point {
    return this.anchor;
  }

  getAnchorMbr(): Mbr {
    return this.getMbr();
  }

  getMbr(scale?: number): Mbr {
    return this.mbr.copy();
  }

  getPathMbr(): Mbr {
    return this.getMbr();
  }

  getNearestEdgePointTo(point: Point): Point {
    return this.anchor;
  }

  getNormal(point: Point): GeometricNormal {
    return new GeometricNormal(this.anchor, this.anchor, this.anchor);
  }

  getRichText(): RichText | null {
    return null;
  }

  isEnclosedBy(rect: Mbr): boolean {
    return false;
  }

  isEnclosedOrCrossedBy(rect: Mbr): boolean {
    return false;
  }

  isNearPoint(point: Point, distance: number): boolean {
    return true;
  }

  isUnderPoint(point: Point): boolean {
    return false;
  }

  private generateMessageId(): string {
    return uuidv4();
  }

  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }

  // BaseItem stubs

  // BaseItem stubs — called by Select tool drag/drop and nesting logic.
  // Comment is not a real board item so all these are no-ops or return null.

  getChildrenIds(): string[] | null {
    return null;
  }

  addChildItems(_children: unknown[]): void { }

  removeChildItems(_children: unknown | unknown[]): void { }

  emitNesting(_children: unknown[]): void { }

  handleNesting(_item: unknown): boolean {
    return false;
  }

  addOnRemoveCallback(_cb: () => void): void { }

  onRemove(): void { }

  highlightMbr(): void { }

  clearHighlightMbr(): void { }

  renderHoverHighlight(_context: DrawingContext): void { }

  shouldFollowItems(): boolean {
    return true;
  }

  onSelectEnd(topItem?: Item): void {
    if (topItem) {
      this.setItemToFollow(topItem.getId());
    }
  }

  render(context: DrawingContext): void { }
}

export const DefaultCommentData: CommentData = {
  itemType: "Comment",
  anchor: new Point(),
  thread: [],
  commentators: [],
  transformation: new DefaultTransformationData(),
  usersUnreadMarks: [],
  resolved: false,
};

registerItem({
  item: Comment,
  defaultData: DefaultCommentData,
  schema: CommentDataSchema,
});
