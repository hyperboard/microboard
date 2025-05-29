import { getProportionalResize } from "Board/Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { Mbr } from "Board/Items";
import { Board } from "Board/Board";
import { ResizeType } from "Board/Selection/Transformer/TransformerHelpers/getResizeType";
import { Point } from "Board/Items/Point/Point";
import { Comment } from "Board/Items/Comment/Comment";
import { AINode } from "Board/Items/AINode/AINode";
import {
	getTransformedTextMbr,
	transformTextFollowingComments,
} from "Board/Selection/Transformer/TransformerHelpers/transformRichText";

export function transformAINode({
	board,
	mbr,
	isWidth,
	resizeType,
	single,
	oppositePoint,
	isHeight,
	isShiftPressed,
	followingComments,
}: {
	board: Board;
	single: AINode;
	resizeType: ResizeType;
	mbr: Mbr;
	oppositePoint: Point;
	isWidth: boolean;
	isHeight: boolean;
	isShiftPressed: boolean;
	followingComments: Comment[] | undefined;
}) {
	const { matrix, mbr: resizedMbr } = getProportionalResize(
		resizeType,
		board.pointer.point,
		mbr,
		oppositePoint,
	);

	if (isWidth) {
		single.text.editor.setMaxWidth(
			resizedMbr.getWidth() / single.text.getScale(),
		);
		single.text.transformation.translateBy(matrix.translateX, 0);
		matrix.translateY = 0;
		matrix.scaleY = 1;
	} else {
		single.text.transformation.scaleByTranslateBy(
			{ x: matrix.scaleX, y: matrix.scaleY },
			{ x: matrix.translateX, y: matrix.translateY },
			Date.now(),
		);
	}

	transformTextFollowingComments({
		board,
		mbr,
		matrix,
		resizedMbr,
		isWidth,
		isHeight,
		isShiftPressed,
		followingComments,
	});

	return getTransformedTextMbr(single, resizedMbr, isWidth);
}
