import { Camera } from "Board/Camera";
import { Matrix } from "./Transformation/Matrix";

/** A container for a CanvasRenderingContext2D, to extend it with more data. */
export class DrawingContext {
	isBorderInvisible = false;
	shapeVisibilityTreshold = 3;
	rectangleVisibilyTreshold = 2;

	constructor(
		public camera: Camera,
		public ctx: CanvasRenderingContext2D,
		public cursorCtx?: CanvasRenderingContext2D,
		public matrix = new Matrix(),
	) {
		this.setCamera(camera);
	}

	dpi(): number {
		return window.devicePixelRatio; // Smell: inject object to query this value
	}

	setCamera(camera: Camera): void {
		this.camera = camera;
		this.matrix = camera.getMatrix();
		const scale = this.matrix.scaleX;
		this.isBorderInvisible = 4 * scale < 0.1;
	}

	clear(): void {
		this.ctx.setTransform(1 * this.dpi(), 0, 0, 1 * this.dpi(), 0, 0);
		this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); // Smell: inject object to query this value
		this.matrix.applyToContext(this.ctx);
	}

	clearCursor(): void {
		if (!this.cursorCtx) {
			return;
		}
		this.cursorCtx.setTransform(1 * this.dpi(), 0, 0, 1 * this.dpi(), 0, 0);
		this.cursorCtx.clearRect(0, 0, window.innerWidth, window.innerHeight); // Smell: inject object to query this value
		this.matrix.applyToContext(this.cursorCtx);
	}

	applyChanges(): void {
		this.matrix.applyToContext(this.ctx);
	}

	getCameraScale(): number {
		return this.camera.getScale();
	}
}
