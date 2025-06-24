import { Message } from "./Comment";

interface CommentBase {
	class: "Comment";
	item: string[];
}

export interface CreateMessage extends CommentBase {
	method: "createMessage";
	message: Message;
}

export interface EditMessage extends CommentBase {
	method: "editMessage";
	message: Message;
}

export interface RemoveMessage extends CommentBase {
	method: "removeMessage";
	messageId: string;
}

export interface SetResolved extends CommentBase {
	method: "setResolved";
	resolved: boolean;
}

export interface SetItemToFollow extends CommentBase {
	method: "setItemToFollow";
	itemId?: string;
}

export interface MarkMessagesAsRead extends CommentBase {
	method: "markMessagesAsRead";
	messageIds: string[];
	userId: number;
}

export interface MarkThreadAsUnread extends CommentBase {
	method: "markThreadAsUnread";
	userId: number;
}

export interface MarkThreadAsRead extends CommentBase {
	method: "markThreadAsRead";
	userId: number;
}

export type CommentOperation =
	| CreateMessage
	| EditMessage
	| RemoveMessage
	| SetResolved
	| SetItemToFollow
	| MarkMessagesAsRead
	| MarkThreadAsUnread
	| MarkThreadAsRead;
