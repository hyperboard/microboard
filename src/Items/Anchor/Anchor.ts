import { DrawingContext } from "Board/Items/DrawingContext";
import { Mbr, Point } from "..";

export const ANCHOR_BORDER_COLOR = "rgb(147, 175, 246)";
export const ANCHOR_BACKGROUND_COLOR = "rgb(255, 255, 255)";
export const ANCHOR_STROKE_WIDTH = 1;
export const ANCHOR_RADIUS = 50;

type Center = {
	x: number;
	y: number;
};

export function renderAnchor(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	center: Center,
	width: number,
	borderColor: string,
	backgroundColor: string,
	strokeWidth: number,
	scale: number,
): void {
	const sizeFactor = 0.8; // Adjust this factor to decrease the size
	const adjustedWidth = width * sizeFactor;

	ctx.strokeStyle = borderColor;
	ctx.lineWidth = strokeWidth / scale;
	ctx.beginPath();
	if (scale > 0) {
		// TODO fix camera scale < 0
		ctx.roundRect(
			center.x - adjustedWidth / scale / 2,
			center.y - adjustedWidth / scale / 2,
			adjustedWidth / scale,
			adjustedWidth / scale,
			1 / scale,
		);
	}
	if (backgroundColor !== "none") {
		ctx.fillStyle = backgroundColor;
		ctx.fill();
	}
	ctx.stroke();
	ctx.closePath();
}

export function renderCircleAnchor(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	center: Center,
	radius: number,
	borderColor: string,
	backgroundColor: string,
	strokeWidth: number,
	scale: number,
): void {
	try {
		renderAnchor(
			ctx,
			center,
			radius,
			borderColor,
			backgroundColor,
			strokeWidth,
			scale,
		);
	} catch {}
}

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

	render(
		context: DrawingContext,
		type: "rect" | "circle" = "rect",
		active = false,
	): void {
		const center = this.getCenter();
		const { ctx } = context;
		const scale = context.getCameraScale();

		switch (type) {
			case "rect":
				try {
					renderAnchor(
						ctx,
						center,
						this.getWidth(),
						this.borderColor,
						this.backgroundColor,
						this.strokeWidth,
						scale,
					);
				} catch {}
				break;
			case "circle":
				renderCircleAnchor(
					ctx,
					center,
					this.radius,
					this.borderColor,
					active ? this.borderColor : this.backgroundColor,
					this.strokeWidth,
					scale,
				);
				break;
		}
	}
}
