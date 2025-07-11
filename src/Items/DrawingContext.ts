import { Camera } from 'Camera';
import { conf } from 'Settings';
import { Matrix } from './Transformation';

/** A container for a CanvasRenderingContext2D, to extend it with more data. */
export class DrawingContext {
	isBorderInvisible = false;
	shapeVisibilityTreshold = 3;
	rectangleVisibilyTreshold = 2;

	constructor(
		public camera: Camera,
		public ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, // fix here
		public cursorCtx?: CanvasRenderingContext2D,
		public matrix = new Matrix()
	) {
		this.setCamera(camera);
	}

	dpi(): number {
		return conf.getDPI();
	}

	setCamera(camera: Camera): void {
		this.camera = camera;
		this.matrix = camera.getMatrix();
		const scale = this.matrix.scaleX;
		this.isBorderInvisible = 4 * scale < 0.1;
	}

	clear(): void {
		this.ctx.setTransform(1 * this.dpi(), 0, 0, 1 * this.dpi(), 0, 0);
		// used window.innerWidth and innerHeight before, if document works fine delete this comment
		this.ctx.clearRect(0, 0, conf.getDocumentWidth(), conf.getDocumentHeight());
		this.matrix.applyToContext(this.ctx);
	}

	clearCursor(): void {
		if (!this.cursorCtx) {
			return;
		}
		this.cursorCtx.setTransform(1 * this.dpi(), 0, 0, 1 * this.dpi(), 0, 0);
		// used window.innerWidth and innerHeight before, if document works fine delete this comment
		this.cursorCtx.clearRect(0, 0, conf.getDocumentWidth(), conf.getDocumentHeight());
		this.matrix.applyToContext(this.cursorCtx);
	}

	applyChanges(): void {
		this.matrix.applyToContext(this.ctx);
	}

	getCameraScale(): number {
		return this.camera.getScale();
	}
}
