import { Comment } from "Board/Items/Comment/Comment";
import { Item } from "Board/Items/Item";
import { Board } from "Board/Board";

export function getFollowingComments(
	board: Board,
	single: Item | null,
): Comment[] | undefined {
	const followingComments: Comment[] = board.items
		.getComments()
		.filter(comment => {
			return (
				comment.getItemToFollow() &&
				comment.getItemToFollow() === single?.getId()
			);
		});
	if (!followingComments.length) {
		return undefined;
	}

	return followingComments;
}
