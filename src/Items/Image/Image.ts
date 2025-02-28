import { Events, Operation } from "Board/Events";
import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { Path, Paths } from "../Path";
import { Point } from "../Point";
import { Transformation } from "../Transformation";
import { TransformationData } from "../Transformation/TransformationData";
import { Placeholder } from "../Placeholder";
import { Board } from "Board/Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { storageURL } from "./ImageHelpers";
import {
	scaleElementBy,
	translateElementBy,
} from "Board/HTMLRender/HTMLRender";
import { ImageOperation } from "./ImageOperation";
import { ImageCommand } from "./ImageCommand";
import { DocumentFactory } from "Board/api/DocumentFactory";

export interface ImageItemData {
	itemType: "Image";
	storageLink: string;
	imageDimension: Dimension;
	transformation: TransformationData;
	linkTo?: string;
}

export interface Dimension {
	height: number;
	width: number;
}

// smell have to redo without document
function getPlaceholderImage(
	board: Board,
	imageDimension?: Dimension,
): HTMLImageElement {
	const placeholderCanvas = document.createElement("canvas");
	const placeholderContext = placeholderCanvas.getContext(
		"2d",
	) as CanvasRenderingContext2D; // this does not fail

	const context = new DrawingContext(board.camera, placeholderContext);

	const placeholder = new Placeholder();

	if (imageDimension) {
		placeholderCanvas.width = imageDimension.width;
		placeholderCanvas.height = imageDimension.height;

		placeholder.transformation.scaleTo(
			imageDimension.width / 100,
			imageDimension.height / 100,
		);
	} else {
		placeholderCanvas.width = 250;
		placeholderCanvas.height = 50;
		placeholder.transformation.scaleTo(250 / 100, 50 / 100);
	}

	placeholder.render(context);

	const placeholderImage = new Image();
	placeholderImage.src = placeholderCanvas.toDataURL();
	return placeholderImage;
}

export interface ImageConstructorData {
	base64?: string;
	storageLink: string;
	imageDimension: Dimension;
}

export class ImageItem extends Mbr {
	readonly itemType = "Image";
	parent = "Board";
	image: HTMLImageElement;
	readonly transformation: Transformation;
	readonly linkTo: LinkTo;
	readonly subject = new Subject<ImageItem>();
	loadCallbacks: ((image: ImageItem) => void)[] = [];
	beforeLoadCallbacks: ((image: ImageItem) => void)[] = [];
	transformationRenderBlock?: boolean = undefined;
	private storageLink: string;
	imageDimension: Dimension;
	board: Board;

	constructor(
		{ base64, storageLink, imageDimension }: ImageConstructorData,
		board: Board,
		private events?: Events,
		private id = "",
	) {
		super();
		this.linkTo = new LinkTo(this.id, events);
		this.board = board;
		this.setStorageLink(storageLink);
		this.imageDimension = imageDimension;
		this.transformation = new Transformation(id, events);
		this.image = new Image();
		this.image.crossOrigin = "anonymous";
		this.image.onload = this.onLoad;
		this.image.onerror = this.onError;
		if (typeof base64 === "string") {
			this.image.src = base64;
		}
		this.linkTo.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.transformation.subject.subscribe(this.onTransform);
	}

	setStorageLink(link: string) {
		try {
			const url = new URL(link);
			// If the link is a valid URL, replace its domain with window.location.origin
			this.storageLink = `${window.location.origin}${url.pathname}`; // Smell: inject object to query this value
		} catch (_) {
			// If the link is not a valid URL, prepend it with storageUrl
			this.storageLink = `${storageURL}/${link}`;
		}
	}

	handleError = (): void => {
		// Provide handling logic for errors
		console.error("Invalid dataUrl or image failed to load.");
		this.image = getPlaceholderImage(this.board);
		this.updateMbr();
		this.subject.publish(this);
		this.shootLoadCallbacks();
	};

	onLoad = async (): Promise<void> => {
		this.shootBeforeLoadCallbacks();
		this.updateMbr();
		this.subject.publish(this);
		this.shootLoadCallbacks();
	};

	onError = (_error): void => {
		this.image = getPlaceholderImage(this.board);
		this.updateMbr();
		this.subject.publish(this);
		this.shootLoadCallbacks();
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

	doOnceBeforeOnLoad = (callback: (image: ImageItem) => void): void => {
		this.loadCallbacks.push(callback);
	};

	doOnceOnLoad = (callback: (image: ImageItem) => void): void => {
		this.loadCallbacks.push(callback);
	};

	setId(id: string): this {
		this.id = id;
		this.transformation.setId(id);
		this.linkTo.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	serialize(): ImageItemData {
		return {
			itemType: "Image",
			storageLink: this.storageLink,
			imageDimension: this.imageDimension,
			transformation: this.transformation.serialize(),
			linkTo: this.linkTo.serialize(),
		};
	}

	private setCoordinates(): void {
		this.left = this.transformation.matrix.translateX;
		this.top = this.transformation.matrix.translateY;
		this.right =
			this.left + this.image.width * this.transformation.matrix.scaleX;
		this.bottom =
			this.top + this.image.height * this.transformation.matrix.scaleY;
		this.subject.publish(this);
	}

	private shootBeforeLoadCallbacks(): void {
		while (this.beforeLoadCallbacks.length > 0) {
			this.beforeLoadCallbacks.shift()!(this);
		}
	}

	private shootLoadCallbacks(): void {
		while (this.loadCallbacks.length > 0) {
			this.loadCallbacks.shift()!(this);
		}
	}

	deserialize(data: Partial<ImageItemData>): ImageItem {
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		this.linkTo.deserialize(data.linkTo);
		this.image.onload = () => {
			this.setCoordinates();
			this.shootLoadCallbacks();
		};
		if (data.storageLink) {
			this.setStorageLink(data.storageLink);
		}

		if (this.image.src) {
			return this;
		}

		this.image = getPlaceholderImage(
			this.board,
			data.imageDimension,
			// "The image is loading from the storage",
		);

		const storageImage = new Image();

		storageImage.onload = () => {
			this.image = storageImage;
			this.onLoad();
		};

		storageImage.onerror = this.onError;
		storageImage.src = this.storageLink;
		return this;
	}

	emit(operation: ImageOperation): void {
		if (this.events) {
			const command = new ImageCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	setDimensions(dim: Dimension): void {
		this.imageDimension = dim;
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "Transformation":
				this.transformation.apply(op);
				break;
			case "LinkTo":
				this.linkTo.apply(op);
				break;
			case "Image":
				// this.deserialize(op.data);
				if (op.data.base64) {
					this.image.src = op.data.base64;
				}
				this.setStorageLink(op.data.storageLink);
				this.setDimensions(op.data.imageDimension);
				this.subject.publish(this);
				break;
		}
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		const ctx = context.ctx;
		ctx.save();
		this.transformation.matrix.applyToContext(ctx);
		ctx.drawImage(this.image, 0, 0);
		ctx.restore();
	}

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("image-item");
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

		// const canvas = documentFactory.createElement('canvas');
		// canvas.width = this.image.width;
		// canvas.height = this.image.height;
		// const ctx = canvas.getContext('2d')!;
		// ctx.drawImage(this.image, 0, 0);
		// const dataURL = canvas.toDataURL();
		// div.style.backgroundImage = `url(${dataURL})`;
		div.style.backgroundImage = `url(${this.storageLink})`;

		div.id = this.getId();
		div.style.width = `${this.imageDimension.width}px`;
		div.style.height = `${this.imageDimension.height}px`;
		div.style.transformOrigin = "top left";
		div.style.transform = transform;
		div.style.position = "absolute";
		div.style.backgroundSize = "cover";

		div.setAttribute("data-link-to", this.linkTo.serialize() || "");
		if (this.getLinkTo()) {
			const linkElement = this.linkTo.renderHTML(documentFactory);
			scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
			translateElementBy(
				linkElement,
				(this.getMbr().getWidth() - parseInt(linkElement.style.width)) /
					scaleX,
				0,
			);
			div.appendChild(linkElement);
		}

		return div;
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

	getRichText(): null {
		return null;
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}
}
