import { Item } from "Board/Items";
import { SpatialIndex } from "Board/SpatialIndex";

export class AlignmentHelper {
	private alignThreshold = 5;

	constructor(private spatialIndex: SpatialIndex) {}

	checkAlignment(movingItem: Item): {
		verticalLines: number[];
		horizontalLines: number[];
	} {
		const movingMBR = movingItem.getMbr();
		const nearbyItems = this.spatialIndex.getNearestTo(
			movingMBR.getCenter(),
			10,
			(otherItem: Item) => otherItem !== movingMBR,
			1000,
		);

		const verticalLines: number[] = [];
		const horizontalLines: number[] = [];

		nearbyItems.forEach(item => {
			if (item === movingItem) {
				return;
			}
			const itemMBR = item.getMbr();

			if (Math.abs(itemMBR.left - movingMBR.left) < this.alignThreshold) {
				verticalLines.push(itemMBR.left);
			}

			if (
				Math.abs(itemMBR.right - movingMBR.right) < this.alignThreshold
			) {
				verticalLines.push(itemMBR.right);
			}

			const movingCenterX = (movingMBR.left + movingMBR.right) / 2;
			const itemCenterX = (itemMBR.left + itemMBR.right) / 2;

			if (Math.abs(movingCenterX - itemCenterX) < this.alignThreshold) {
				verticalLines.push(itemCenterX);
			}

			if (Math.abs(itemMBR.top - movingMBR.top) < this.alignThreshold) {
				horizontalLines.push(itemMBR.top);
			}

			if (
				Math.abs(itemMBR.bottom - movingMBR.bottom) <
				this.alignThreshold
			) {
				horizontalLines.push(itemMBR.bottom);
			}

			const movingCenterY = (movingMBR.top + movingMBR.bottom) / 2;
			const itemCenterY = (itemMBR.top + itemMBR.bottom) / 2;

			if (Math.abs(movingCenterY - itemCenterY) < this.alignThreshold) {
				horizontalLines.push(itemCenterY);
			}
		});

		console.log("Линии в классе", verticalLines, horizontalLines);
		return { verticalLines, horizontalLines };
	}
}
