import { Shape } from "bezier-js";
import { TransformManyItems } from "Board/Items/Transformation/TransformationOperations";
import {
	getProportionalResize,
	getResize,
} from "Board/Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { Sticker } from "Board/Items/Sticker/Sticker";

export function transform() {
	let translation: TransformManyItems | boolean = {};
	if (this.isShiftPressed && single.itemType !== "Sticker") {
		const { matrix, mbr: resizedMbr } = getProportionalResize(
			this.resizeType,
			this.board.pointer.point,
			mbr,
			this.oppositePoint,
		);
		this.mbr = resizedMbr;
		translation = this.handleMultipleItemsResize(
			{ matrix, mbr: resizedMbr },
			mbr,
			isWidth,
			isHeight,
		);
		this.selection.transformMany(translation, this.beginTimeStamp);
	} else {
		this.mbr = single.doResize(
			this.resizeType,
			this.board.pointer.point,
			mbr,
			this.oppositePoint,
			this.startMbr || new Mbr(),
			this.beginTimeStamp,
		).mbr;

		if (followingComments) {
			const { matrix, mbr: resizedMbr } =
				single instanceof Sticker
					? getProportionalResize(
							this.resizeType,
							this.board.pointer.point,
							mbr,
							this.oppositePoint,
						)
					: getResize(
							this.resizeType,
							this.board.pointer.point,
							mbr,
							this.oppositePoint,
						);
			translation = this.handleMultipleItemsResize(
				{ matrix, mbr: resizedMbr },
				mbr,
				isWidth,
				isHeight,
				followingComments,
			);
			this.selection.transformMany(translation, this.beginTimeStamp);
		}
	}
}
