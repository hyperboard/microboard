import { Subject } from "../../../Subject";
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
	avatar?: string;
}

export interface Message {
	date: Date;
	text: string;
	id: string;
	commentator: Commentator;
	readers: string[];
}

export interface CommentData {
	readonly itemType: "Comment";
	anchor: Point;
	thread: Message[];
	commentators: Commentator[];
	transformation: TransformationData;
	usersUnreadMarks: string[];
	resolved: boolean;
	itemToFollow?: string;
}

export class Comment implements Geometry {
	readonly itemType = "Comment";
	parent = "Board";
	readonly transformation: Transformation;
	private commentators: Commentator[] = [];
	private thread: Message[] = [];
	private usersUnreadMarks: string[] = [];
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
						c => c.username === op.message.commentator.username,
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
				this.applyReadMessages(op.messageIds, op.username);
				break;
			case "markThreadAsUnread":
				this.usersUnreadMarks = [...this.usersUnreadMarks, op.username];
				break;
			case "markThreadAsRead":
				this.usersUnreadMarks = this.usersUnreadMarks.filter(
					username => username !== op.username,
				);
				break;
		}
	}

	saveMessage(text: string, username: string, avatar?: string): void {
		this.emit({
			class: "Comment",
			method: "createMessage",
			item: [this.id],
			message: {
				text,
				id: this.generateMessageId(),
				commentator: {
					username,
					avatar,
				},
				date: new Date(),
				readers: [username],
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

	markThreadAsUnread(username: string): void {
		this.emit({
			class: "Comment",
			method: "markThreadAsUnread",
			item: [this.id],
			username,
		});
	}

	markThreadAsRead(username: string): void {
		this.emit({
			class: "Comment",
			method: "markThreadAsRead",
			item: [this.id],
			username,
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

	getUnreadMessages(username = "anonymous"): Message[] | null {
		const unreadMessages = this.thread.filter(
			mes => !mes.readers.includes(username),
		);
		if (unreadMessages.length === 0) {
			return null;
		}
		return unreadMessages;
	}

	getIsThreadMarkedAsUnread(username: string) {
		return this.usersUnreadMarks.some(u => u === username);
	}

	markMessagesAsRead(messageIds: string[], username?: string): void {
		if (!username) {
			return this.applyReadMessages(messageIds, "anonymous");
		}

		this.emit({
			class: "Comment",
			method: "markMessagesAsRead",
			item: [this.id],
			messageIds,
			username,
		});
	}

	applyReadMessages(messageIds: string[], username: string) {
		const readMessages = this.thread.filter(mes =>
			messageIds.includes(mes.id),
		);
		readMessages.forEach(mes => mes.readers.push(username));
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
		// const anchor = this.anchor;
		// const tolerance = 50 * this.transformation.getScale().x
		// return (
		// 	anchor.x > rect.left - tolerance &&
		// 	anchor.x < rect.right + tolerance &&
		// 	anchor.y > rect.top - tolerance &&
		// 	anchor.y < rect.bottom + tolerance
		// );
		return false;
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		// const anchor = this.anchor;
		// const tolerance = 50 * this.transformation.getScale().x
		// return (
		// 	anchor.x > rect.left - tolerance &&
		// 	anchor.x < rect.right + tolerance &&
		// 	anchor.y > rect.top - tolerance &&
		// 	anchor.y < rect.bottom + tolerance
		// );
		return false;
	}

	isNearPoint(point: Point, distance: number): boolean {
		return true;
	}

	isUnderPoint(point: Point): boolean {
		// const diffX = point.x - this.anchor.x;
		// const diffY = point.y - this.anchor.y;
		// const tolerance = 50 * this.transformation.getScale().x
		// return diffX < tolerance && diffX > -tolerance && diffY < tolerance && diffY > -tolerance;
		return false;
	}

	private generateMessageId(): string {
		return uuidv4();
	}

	getLink() {
		return `${window.location.origin}${
			window.location.pathname
		}?focus=${this.getId()}`;
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}

	render(context: DrawingContext): void {}
}
