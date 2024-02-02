import { Camera } from "Board/Camera";
import { Matrix } from "./Transformation/Matrix";

/** A container for a CanvasRenderingContext2D, to extend it with more data. */
export class DrawingContext {
	DPI = window.devicePixelRatio;
	isBorderInvisible = false;
	shapeVisibilityTreshold = 4;
	rectangleVisibilyTreshold = 2;

	constructor(
		public camera: Camera,
		public ctx: CanvasRenderingContext2D,
		public matrix = new Matrix(),
	) {
		this.setCamera(camera);
	}

	setCamera(camera: Camera): void {
		this.camera = camera;
		this.matrix = camera.getMatrix();
		const scale = this.matrix.scaleX;
		this.isBorderInvisible = 4 * scale < 0.1;
		this.shapeVisibilityTreshold = 4 / scale;
		this.rectangleVisibilyTreshold = 2 / scale;
	}

	clear(): void {
		this.ctx.setTransform(1 * this.DPI, 0, 0, 1 * this.DPI, 0, 0);
		this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
		this.matrix.applyToContext(this.ctx);
	}

	applyChanges(): void {
		this.matrix.applyToContext(this.ctx);
	}

	getCameraScale(): number {
		return this.camera.getScale();
	}
}
