import { Command } from "../../Events";
import { Comment } from "./Comment";
import {CommentOperation, EditMessage} from "./CommentOperation";
import { mapItemsByOperation } from "../ItemsCommandUtils";

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
				return mapItemsByOperation(this.comment, comment => {
					return {
						...this.operation,
						message:
							comment.getThread()[comment.getThread().length - 1],
					};
				});
			case "editMessage":
				return mapItemsByOperation(this.comment, comment => {
					return {
						...op,
						message: comment
							.getThread()
							.find(mes => mes.id === op.message.id),
					} as EditMessage;
				});
			case "removeMessage":
				return mapItemsByOperation(this.comment, comment => {
					return {
						...this.operation,
						messageId: op.messageId,
					};
				});
			case "setResolved":
				return mapItemsByOperation(this.comment, comment => {
					return {
						...this.operation,
						resolved: comment.getResolved(),
					};
				});
			case "markMessagesAsRead":
				return mapItemsByOperation(this.comment, comment => {
					return {
						...this.operation,
						messageIds: comment
							.getThread()
							.filter(mes => op.messageIds.includes(mes.id)).map(mes => mes.id),
						userId: op.userId,
					};
				});
			case "markThreadAsUnread":
			case "markThreadAsRead":
				return mapItemsByOperation(this.comment, comment => {
					return {
						...this.operation,
						userId: op.userId,
					};
				});
			case "setItemToFollow":
				return mapItemsByOperation(this.comment, comment => {
					return {
						...this.operation,
						itemId: op.itemId,
					};
				});
		}
	}
}
