import { Subject } from "../../../shared/Subject";
import { Events, Operation } from "../../Events";
import { Point } from "../Point";
import { Transformation, TransformationData } from "../Transformation";
import { CommentOperation } from "./CommentOperation";
import { CommentCommand } from "./CommentCommand";
import { Mbr } from "../Mbr";
import { Geometry } from "../Geometry";
import { GeometricNormal } from "../GeometricNormal";
import { RichText } from "../RichText";
import { DrawingContext } from "../DrawingContext";
import { Line } from "../Line";
import { v4 as uuidv4 } from "uuid";
import { LinkTo } from "../LinkTo/LinkTo";

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
}

const ANONYMOUS_ID = 9_999_999_999;

export class Comment implements Geometry {
	readonly itemType = "Comment";
	parent = "Board";
	readonly transformation: Transformation;
	private commentators: Commentator[] = [];
	private thread: Message[] = [];
	private usersUnreadMarks: number[] = [];
	private resolved = false;
	private itemToFollow?: string;
	readonly subject = new Subject<Comment>();
	readonly linkTo: LinkTo;
	transformationRenderBlock?: boolean = undefined;

	constructor(
		private anchor = new Point(),
		private events?: Events,
		private id = "",
	) {
		this.transformation = new Transformation(id, events);
		this.transformation.subject.subscribe(() => {
			this.transform();
			this.subject.publish(this);
		});
		this.transform();
		this.linkTo = new LinkTo(this.id, this.events);
		this.linkTo.subject.subscribe(() => {
			this.subject.publish(this);
		});
	}

	serialize(): CommentData {
		return {
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

	deserialize(data: CommentData): this {
		if (data.anchor) {
			this.anchor = new Point(data.anchor.x, data.anchor.y);
		}
		this.thread = data.thread;
		this.commentators = data.commentators;
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
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

	private emit(operation: CommentOperation): void {
		if (this.events) {
			const command = new CommentCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	getItemToFollow(): string | undefined {
		return this.itemToFollow;
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
		switch (op.class) {
			case "Comment":
				this.applyCommentOperation(op);
				this.transform();
				break;
			case "Transformation":
				this.transformation.apply(op);
				break;
			default:
				return;
		}
		this.subject.publish(this);
	}

	private applyCommentOperation(op: CommentOperation): void {
		switch (op.method) {
			case "createMessage":
				this.thread = [...this.thread, op.message];
				if (
					!this.commentators.some(
						c => c.id === op.message.commentator.id,
					)
				) {
					this.commentators = [
						...this.commentators,
						op.message.commentator,
					];
				}
				break;
			case "editMessage":
				const thread = this.thread;
				const index = thread.findIndex(mes => mes.id === op.message.id);
				this.thread = [
					...thread.slice(0, index),
					{ ...op.message },
					...thread.slice(index + 1, thread.length),
				];
				break;
			case "removeMessage":
				this.thread = this.thread.filter(
					mes => mes.id !== op.messageId,
				);
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
					userId => userId !== op.userId,
				);
				break;
		}
	}

	saveMessage(
		text: string,
		username: string,
		id: number,
		avatar?: string,
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
		const message = this.getThread().find(mes => mes.id === id);
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

	private transform(): void {
		const matrix = this.transformation.matrix;
		if (matrix.translateX && matrix.translateY) {
			this.anchor = new Point(matrix.translateX, matrix.translateY);
		} else {
			matrix.translateX = this.anchor.x;
			matrix.translateY = this.anchor.y;
		}
	}

	getUnreadMessages(userId = ANONYMOUS_ID): Message[] | null {
		const unreadMessages = this.thread.filter(
			mes => mes && !mes.readers.includes(userId),
		);
		if (unreadMessages.length === 0) {
			return null;
		}
		return unreadMessages;
	}

	getIsThreadMarkedAsUnread(userId: number) {
		return this.usersUnreadMarks.some(id => id === userId);
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
		const readMessages = this.thread.filter(mes =>
			messageIds.includes(mes.id),
		);
		readMessages.forEach(mes => mes.readers.push(userId));
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
		const anchor = this.anchor.copy();
		return new Mbr(anchor.x, anchor.y, anchor.x, anchor.y);
	}

	getMbr(scale?: number): Mbr {
		const anchor = this.anchor.copy();
		return new Mbr(anchor.x, anchor.y, anchor.x, anchor.y);
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

	getPath(): null {
		return null;
	}

	getSnapAnchorPoints(): Point[] | null {
		return null;
	}

	render(context: DrawingContext): void {}
}
