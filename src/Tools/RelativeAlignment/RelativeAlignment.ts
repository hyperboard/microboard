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
			const itemMbr = item.getMbr();
			
			const centerXMoving = (movingMBR.left + movingMBR.right) / 2;
			const centerXItem = (itemMbr.left + itemMbr.right) / 2;
	
			if (Math.abs(centerXItem - centerXMoving) < this.alignThreshold) {
				verticalLines.push(new Line(
					new Point(centerXItem, Math.min(itemMbr.top, movingMBR.top)), 
                	new Point(centerXItem, Math.max(itemMbr.bottom, movingMBR.bottom))
				));
			}
	
			const centerYMoving = (movingMBR.top + movingMBR.bottom) / 2;
			const centerYItem = (itemMbr.top + itemMbr.bottom) / 2;
	
			if (Math.abs(centerYItem - centerYMoving) < this.alignThreshold) {
				horizontalLines.push(new Line(
					new Point(Math.min(itemMbr.left, movingMBR.left), centerYItem),
					new Point(Math.max(itemMbr.right, movingMBR.right), centerYItem)
				));
			}
	
			if (Math.abs(itemMbr.left - movingMBR.left) < this.alignThreshold) {
				verticalLines.push(new Line(
					new Point(itemMbr.left, Math.min(itemMbr.top, movingMBR.top)), 
					new Point(itemMbr.left, Math.max(itemMbr.bottom, movingMBR.bottom)) 
				));
			}
			if (Math.abs(itemMbr.right - movingMBR.right) < this.alignThreshold) {
				verticalLines.push(new Line(
					new Point(itemMbr.right, Math.min(itemMbr.top, movingMBR.top)), 
					new Point(itemMbr.right, Math.max(itemMbr.bottom, movingMBR.bottom)) 
				));
			}
	
			
			if (Math.abs(itemMbr.top - movingMBR.top) < this.alignThreshold) {
				horizontalLines.push(new Line(
					new Point(Math.min(itemMbr.left, movingMBR.left), itemMbr.top), 
					new Point(Math.max(itemMbr.right, movingMBR.right), itemMbr.top) 
				));
			}
			if (Math.abs(itemMbr.bottom - movingMBR.bottom) < this.alignThreshold) {
				horizontalLines.push(new Line(
					new Point(Math.min(itemMbr.left, movingMBR.left), itemMbr.bottom), 
					new Point(Math.max(itemMbr.right, movingMBR.right), itemMbr.bottom) 
				));
			}
		});
		return { verticalLines, horizontalLines };
	}
}
