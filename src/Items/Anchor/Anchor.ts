import { DrawingContext } from "Board/Items/DrawingContext";
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
		public borderColor = "black",
		public backgroundColor = "none",
		public strokeWidth = 1,
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
		ctx.strokeStyle = this.borderColor;
		ctx.lineWidth = this.strokeWidth / scale;
		ctx.beginPath();
		ctx.arc(
			center.x,
			center.y,
			this.getWidth() / scale / 2,
			0,
			Math.PI * 2,
			false,
		);
		if (this.backgroundColor !== "none") {
			ctx.fillStyle = this.backgroundColor;
			ctx.fill();
		}
		ctx.stroke();
		ctx.closePath();
	}
}
