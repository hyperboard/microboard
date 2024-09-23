import { Item, Line, Point } from "Board/Items";
import { SpatialIndex } from "Board/SpatialIndex";

export class AlignmentHelper {
	private alignThreshold = 5;

	constructor(private spatialIndex: SpatialIndex) {}

	checkAlignment(movingItem: Item): {
		verticalLines: Line[];
		horizontalLines: Line[];
	} {
		const movingMBR = movingItem.getMbr();
		const nearbyItems = this.spatialIndex.getNearestTo(
			movingMBR.getCenter(),
			10,
			(otherItem: Item) => otherItem !== movingMBR,
			1000,
		);

		const verticalLines: Line[] = [];
		const horizontalLines: Line[] = [];

		nearbyItems.forEach(item => {
			if (item === movingItem) {
				return;
			}
			const itemMBR = item.getMbr();
			const itemLines = itemMBR.getLines();
			const movingLines = movingMBR.getLines();

			itemLines.forEach((line, index) => {
				const movingLine = movingLines[index];

				if (index < 2) { 
					if (Math.abs(line.start.y - movingLine.start.y) < this.alignThreshold) {
						horizontalLines.push(new Line(new Point(movingLine.start.x, line.start.y), new Point(movingLine.end.x, line.start.y)));
					}
				} else { 
					if (Math.abs(line.start.x - movingLine.start.x) < this.alignThreshold) {
						verticalLines.push(new Line(new Point(line.start.x, movingLine.start.y), new Point(line.start.x, movingLine.end.y)));
					}
				}
			});
		});

		return { verticalLines, horizontalLines };
	}
}
