import { Events, Operation } from "Board/Events";
import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { Path, Paths } from "../Path";
import { Point } from "../Point";
import { Transformation, TransformationData } from "../Transformation";

export interface ImageItemData {
	itemType: "Image";
	dataUrl: string;
	transformation: TransformationData;
}

const errorImageCanvas = document.createElement("canvas");
const errorImageContext = errorImageCanvas.getContext(
	"2d",
) as CanvasRenderingContext2D; // this does not fail
errorImageCanvas.width = 250;
errorImageCanvas.height = 50;
errorImageContext.font = "16px Arial";
errorImageContext.fillStyle = "black";
errorImageContext.fillText("The image could not be loaded.", 0, 25);
const errorImage = new Image();
errorImage.src = errorImageCanvas.toDataURL();

export class ImageItem extends Mbr {
	readonly itemType = "Image";
	parent = "Board";
	image: HTMLImageElement;
	readonly transformation: Transformation;
	dataUrl: string;
	readonly subject = new Subject<ImageItem>();
	loadCallbacks: ((image: ImageItem) => void)[] = [];

	constructor(
		dataUrl: string | ArrayBuffer | null | undefined,
		events?: Events,
		private id = "",
	) {
		super();
		this.transformation = new Transformation(id, events);

		// Convert dataUrl to string if it's valid, else handle the error
		if (typeof dataUrl === "string") {
			this.dataUrl = dataUrl;
			this.image = new Image();
			this.image.onload = this.onLoad;
			this.image.onerror = this.onError;
			this.image.src = dataUrl;
		} else {
			this.dataUrl = "";
			this.image = new Image();
			this.image.src = ""; // or provide a default/fallback dataUrl
			this.handleError();
		}

		this.transformation.subject.subscribe(this.onTransform);
	}

	handleError = (): void => {
		// Provide handling logic for errors
		console.error("Invalid dataUrl or image failed to load.");
		this.image = errorImage; // assuming errorImage is defined elsewhere
		this.updateMbr();
		this.subject.publish(this);
		while (this.loadCallbacks.length > 0) {
			this.loadCallbacks.shift()!(this);
		}
	};

	onLoad = (): void => {
		this.updateMbr();
		this.subject.publish(this);
		while (this.loadCallbacks.length > 0) {
			this.loadCallbacks.shift()!(this);
		}
	};

	onError = (): void => {
		this.image = errorImage;
		this.updateMbr();
		this.subject.publish(this);
		while (this.loadCallbacks.length > 0) {
			this.loadCallbacks.shift()!(this);
		}
	};

	onTransform = (): void => {
		this.updateMbr();
		this.subject.publish(this);
	};

	updateMbr(): void {
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		this.left = translateX;
		this.top = translateY;
		this.right = this.left + this.image.width * scaleX;
		this.bottom = this.top + this.image.height * scaleY;
	}

	doOnceOnLoad = (callback: (image: ImageItem) => void): void => {
		this.loadCallbacks.push(callback);
	};

	setId(id: string): this {
		this.id = id;
		this.transformation.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	serialize(): ImageItemData {
		return {
			itemType: "Image",
			dataUrl: this.dataUrl,
			transformation: this.transformation.serialize(),
		};
	}

	deserialize(data: ImageItemData): ImageItem {
		this.transformation.deserialize(data.transformation);
		this.dataUrl = data.dataUrl;
		this.image.onload = () => {
			this.left = this.transformation.matrix.translateX;
			this.top = this.transformation.matrix.translateY;
			this.right =
				this.left +
				this.image.width * this.transformation.matrix.scaleX;
			this.bottom =
				this.top +
				this.image.height * this.transformation.matrix.scaleY;
			this.subject.publish(this);
			while (this.loadCallbacks.length > 0) {
				this.loadCallbacks.shift()!(this);
			}
		};
		this.image.src = data.dataUrl;
		this.left = this.transformation.matrix.translateX;
		this.top = this.transformation.matrix.translateY;
		this.right =
			this.left + this.image.width * this.transformation.matrix.scaleX;
		this.bottom =
			this.top + this.image.height * this.transformation.matrix.scaleY;
		return this;
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "Transformation":
				this.transformation.apply(op);
				break;
		}
	}

	render(context: DrawingContext): void {
		const ctx = context.ctx;
		ctx.save();
		this.transformation.matrix.applyToContext(ctx);
		ctx.drawImage(this.image, 0, 0);
		ctx.restore();
	}

	getPath(): Path | Paths {
		const { left, top, right, bottom } = this.getMbr();
		const leftTop = new Point(left, top);
		const rightTop = new Point(right, top);
		const rightBottom = new Point(right, bottom);
		const leftBottom = new Point(left, bottom);
		return new Path(
			[
				new Line(leftTop, rightTop),
				new Line(rightTop, rightBottom),
				new Line(rightBottom, leftBottom),
				new Line(leftBottom, leftTop),
			],
			true,
		);
	}

	getSnapAnchorPoints(): Point[] {
		const mbr = this.getMbr();
		const width = mbr.getWidth();
		const height = mbr.getHeight();
		return [
			new Point(mbr.left + width / 2, mbr.top),
			new Point(mbr.left + width / 2, mbr.bottom),
			new Point(mbr.left, mbr.top + height / 2),
			new Point(mbr.right, mbr.top + height / 2),
		];
	}

	isClosed(): boolean {
		return true;
	}
}
