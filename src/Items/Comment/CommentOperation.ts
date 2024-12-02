import { Message } from "./Comment";

interface CommentBase {
	class: "Comment";
	item: string[];
}

interface CreateMessage extends CommentBase {
	method: "createMessage";
	message: Message;
}

interface EditMessage extends CommentBase {
	method: "editMessage";
	message: Message;
}

interface RemoveMessage extends CommentBase {
	method: "removeMessage";
	messageId: string;
}

interface SetResolved extends CommentBase {
	method: "setResolved";
	resolved: boolean;
}

interface SetItemToFollow extends CommentBase {
	method: "setItemToFollow";
	itemId?: string;
}

interface MarkMessagesAsRead extends CommentBase {
	method: "markMessagesAsRead";
	messageIds: string[];
	username: string;
}

interface MarkThreadAsUnread extends CommentBase {
	method: "markThreadAsUnread";
	username: string;
}

interface MarkThreadAsRead extends CommentBase {
	method: "markThreadAsRead";
	username: string;
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
