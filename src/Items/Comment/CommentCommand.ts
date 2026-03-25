import { Command } from "../../Events";
import { Comment } from "./Comment";
import {CommentOperation, EditMessage} from "./CommentOperation";

export class CommentCommand implements Command {
	private reverse: { item: Comment; operation: CommentOperation }[];

	constructor(
		private comment: Comment[],
		private operation: CommentOperation,
	) {
		this.reverse = this.getReverse();
	}

	apply(): void {
		for (const comment of this.comment) {
			comment.apply(this.operation);
		}
	}

	revert(): void {
		this.reverse.forEach(({ item, operation }) => {
			item.apply(operation);
		});
	}

	getReverse(): {
		item: Comment;
		operation: CommentOperation;
	}[] {
		const op = this.operation;
		switch (op.method) {
			case "createMessage":
				return this.comment.map(comment => {
					return {
						item: comment,
						operation: {
							...this.operation,
							message:
								comment.getThread()[comment.getThread().length - 1],
						},
					};
				});
			case "editMessage":
				return this.comment.map(comment => {
					return {
						item: comment,
						operation: {
							...op,
							message: comment
								.getThread()
								.find(mes => mes.id === op.message.id),
						} as EditMessage,
					};
				});
			case "removeMessage":
				return this.comment.map(comment => {
					return {
						item: comment,
						operation: {
							...this.operation,
							messageId: op.messageId,
						},
					};
				});
			case "setResolved":
				return this.comment.map(comment => {
					return {
						item: comment,
						operation: {
							...this.operation,
							resolved: comment.getResolved(),
						},
					};
				});
			case "markMessagesAsRead":
				return this.comment.map(comment => {
					return {
						item: comment,
						operation: {
							...this.operation,
							messageIds: comment
								.getThread()
								.filter(mes => op.messageIds.includes(mes.id)).map(mes => mes.id),
							userId: op.userId,
						},
					};
				});
			case "markThreadAsUnread":
			case "markThreadAsRead":
				return this.comment.map(comment => {
					return {
						item: comment,
						operation: {
							...this.operation,
							userId: op.userId,
						},
					};
				});
			case "setItemToFollow":
				return this.comment.map(comment => {
					return {
						item: comment,
						operation: {
							...this.operation,
							itemId: op.itemId,
						},
					};
				});
		}
	}
}
