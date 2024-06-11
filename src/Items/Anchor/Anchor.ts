import { DrawingContext } from "Board/Items/DrawingContext";
import {
	ANCHOR_BACKGROUND_COLOR,
	ANCHOR_BORDER_COLOR,
	ANCHOR_STROKE_WIDTH,
	renderAnchor,
} from "View/Items/Anchor";
import { Mbr, Point } from "..";

/**
 * The minimum bounding rectangle (MBR), also known as bounding box (BBOX) or envelope.
 * https://en.wikipedia.org/wiki/Minimum_bounding_rectangle
 */
export class Anchor extends Mbr {
	constructor(
		public x = 0,
		public y = 0,
		public radius = 50,
		public borderColor = ANCHOR_BORDER_COLOR,
		public backgroundColor = ANCHOR_BACKGROUND_COLOR,
		public strokeWidth = ANCHOR_STROKE_WIDTH,
	) {
		super(
			x - radius,
			y - radius,
			x + radius,
			y + radius,
			borderColor,
			backgroundColor,
			strokeWidth,
		);
	}

	getDistanceTo(point: { x: number; y: number }): number {
		return Math.sqrt(
			Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2),
		);
	}

	getCenter(): Point {
		return new Point(this.x, this.y);
	}

	render(context: DrawingContext): void {
		const center = this.getCenter();
		const { ctx } = context;
		const scale = context.getCameraScale();

		renderAnchor(
			ctx,
			center,
			this.getWidth(),
			this.borderColor,
			this.backgroundColor,
			this.strokeWidth,
			scale,
		);
	}
}
