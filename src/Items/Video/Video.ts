import { Events, Operation } from "Board/Events";
import { Subject } from "shared/Subject";
import { DrawingContext } from "../DrawingContext";
import { Mbr } from "../Mbr";
import { Transformation } from "../Transformation";
import { TransformationData } from "../Transformation/TransformationData";
import { Placeholder } from "../Placeholder";
import { Board } from "Board/Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { storageURL } from "./VideoHelpers";
import { DocumentFactory } from "Board/api/DocumentFactory";
import { Paths, Path } from "../Path";
import { VideoCommand } from "Board/Items/Video/VideoCommand";
import { Point } from "Board/Items/Point/Point";
import { Line } from "Board/Items/Line/Line";
import { SETTINGS } from "Board/Settings";

export interface VideoItemData {
	itemType: "Video";
	url: string;
	videoDimension: Dimension;
	transformation: TransformationData;
}

export interface Dimension {
	height: number;
	width: number;
}

const PlaceholderImg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 11.1L7 9.1L12.5 14.6L16 11.1L19 14.1V5H5V11.1ZM4 3H20C20.2652 3 20.5196 3.10536 20.7071 3.29289C20.8946 3.48043 21 3.73478 21 4V20C21 20.2652 20.8946 20.5196 20.7071 20.7071C20.5196 20.8946 20.2652 21 20 21H4C3.73478 21 3.48043 20.8946 3.29289 20.7071C3.10536 20.5196 3 20.2652 3 20V4C3 3.73478 3.10536 3.48043 3.29289 3.29289C3.48043 3.10536 3.73478 3 4 3ZM15.5 10C15.1022 10 14.7206 9.84196 14.4393 9.56066C14.158 9.27936 14 8.89782 14 8.5C14 8.10218 14.158 7.72064 14.4393 7.43934C14.7206 7.15804 15.1022 7 15.5 7C15.8978 7 16.2794 7.15804 16.5607 7.43934C16.842 7.72064 17 8.10218 17 8.5C17 8.89782 16.842 9.27936 16.5607 9.56066C16.2794 9.84196 15.8978 10 15.5 10Z" fill="white" fill-opacity="0.6"/>
</svg>`;

function getPlaceholderVideo(
	board: Board,
	videoDimension?: Dimension,
): HTMLImageElement {
	const placeholderCanvas = document.createElement("canvas");
	const placeholderContext = placeholderCanvas.getContext(
		"2d",
	) as CanvasRenderingContext2D;

	const context = new DrawingContext(board.camera, placeholderContext);
	const placeholder = new Placeholder();

	if (videoDimension) {
		placeholderCanvas.width = videoDimension.width;
		placeholderCanvas.height = videoDimension.height;
		placeholder.transformation.scaleTo(
			videoDimension.width / 100,
			videoDimension.height / 100,
		);
	} else {
		placeholderCanvas.width = 250;
		placeholderCanvas.height = 150;
		placeholder.transformation.scaleTo(250 / 100, 150 / 100);
	}

	placeholder.render(context);

	const placeholderImage = new Image();
	placeholderImage.src = placeholderCanvas.toDataURL();
	return placeholderImage;
}

export interface VideoConstructorData {
	storageLink?: string;
	videoUrl?: string;
	videoDimension: Dimension;
}

export class VideoItem extends Mbr {
	readonly itemType = "Video";
	parent = "Board";
	video: HTMLVideoElement;
	preview: HTMLImageElement = new Image();
	readonly transformation: Transformation;
	readonly linkTo: LinkTo;
	readonly subject = new Subject<VideoItem>();
	loadCallbacks: ((video: VideoItem) => void)[] = [];
	beforeLoadCallbacks: ((video: VideoItem) => void)[] = [];
	transformationRenderBlock?: boolean = undefined;
	private url: string = "";
	private isStorageUrl = false;
	videoDimension: Dimension;
	board: Board;
	private isPlaying: boolean = false;
	private shouldShowControls: boolean = false;
	private playBtnMbr: Mbr = new Mbr();

	constructor(
		{ storageLink, videoUrl, videoDimension }: VideoConstructorData,
		board: Board,
		private events?: Events,
		private id = "",
	) {
		super();
		// this.preview.src = PlaceholderImg;
		this.linkTo = new LinkTo(this.id, events);
		this.board = board;
		this.setUrl(storageLink, videoUrl);
		this.videoDimension = videoDimension;
		this.transformation = new Transformation(id, events);
		if (!SETTINGS.getYouTubeId(this.url)) {
			this.video = document.createElement("video");
			this.video.crossOrigin = "anonymous";
			this.video.muted = true;
			this.video.onloadedmetadata = this.onLoadedMetadata;
			this.video.onerror = this.onError;
			this.video.src = this.url;
		}
		this.linkTo.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.transformation.subject.subscribe(this.onTransform);
	}

	private captureFirstFrame() {
		if (SETTINGS.getYouTubeId(this.url)) {
			return;
		}
		this.video.currentTime = 0.1;
		const handleSeeked = () => {
			const canvas = document.createElement("canvas");
			canvas.width = this.video.videoWidth;
			canvas.height = this.video.videoHeight;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
				this.preview = new Image();
				this.preview.src = canvas.toDataURL();
				this.preview.onload = () => {
					this.updateMbr();
					this.subject.publish(this);
					this.shootLoadCallbacks();
				};
			} else {
				this.onError(undefined);
			}
			this.video.removeEventListener("seeked", handleSeeked);
		};
		this.video.addEventListener("seeked", handleSeeked);
	}

	onTransform = (): void => {
		this.updateMbr();
		this.subject.publish(this);
	};

	doOnceBeforeOnLoad = (callback: (video: VideoItem) => void): void => {
		this.loadCallbacks.push(callback);
	};

	doOnceOnLoad = (callback: (video: VideoItem) => void): void => {
		this.loadCallbacks.push(callback);
	};

	getIsStorageUrl() {
		return this.isStorageUrl;
	}

	setIsPlaying(isPlaying: boolean) {
		this.isPlaying = isPlaying;
		this.subject.publish(this);
	}

	getIsPlaying() {
		return this.isPlaying;
	}

	setShouldShowControls(shouldShowControls: boolean) {
		this.shouldShowControls = shouldShowControls;
		this.subject.publish(this);
	}

	getShouldShowControls() {
		return this.shouldShowControls;
	}

	getPlayBtnMbr() {
		return this.playBtnMbr;
	}

	setUrl(storageLink?: string, videoUrl?: string): void {
		if (videoUrl) {
			this.url = videoUrl;
		} else if (storageLink) {
			try {
				const url = new URL(storageLink);
				this.url = `${window.location.origin}${url.pathname}`;
			} catch (_) {
				this.url = `${storageURL}/${storageLink}`;
			}
			this.isStorageUrl = true;
		}
	}

	getUrl() {
		return this.url;
	}

	onLoadedMetadata = () => {
		this.videoDimension = {
			width: this.video.videoWidth,
			height: this.video.videoHeight,
		};
		this.captureFirstFrame();
		this.shootBeforeLoadCallbacks();
	};

	onError = (_error: any) => {
		this.preview = getPlaceholderVideo(this.board, this.videoDimension);
		this.updateMbr();
		this.subject.publish(this);
		this.shootLoadCallbacks();
	};

	updateMbr(): void {
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		this.left = translateX;
		this.top = translateY;
		this.right = this.left + this.videoDimension.width * scaleX;
		this.bottom = this.top + this.videoDimension.height * scaleY;
		const playBtnSize = 50;
		const scaledPlayBtn = playBtnSize * this.transformation.matrix.scaleX;
		this.playBtnMbr = new Mbr(
			this.left + this.getWidth() / 2 - scaledPlayBtn / 2,
			this.top + this.getHeight() / 2 - scaledPlayBtn / 2,
			this.right - this.getWidth() / 2 + scaledPlayBtn / 2,
			this.bottom - this.getHeight() / 2 + scaledPlayBtn / 2,
		);
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock || !this.preview.complete) return;
		const ctx = context.ctx;
		ctx.save();
		this.transformation.matrix.applyToContext(ctx);
		ctx.drawImage(this.preview, 0, 0);

		if (this.shouldShowControls) {
			ctx.restore();
			ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
			ctx.fillRect(
				this.left,
				this.top,
				this.getWidth(),
				this.getHeight(),
			);

			const playBtnSize = this.playBtnMbr.getWidth();
			const left = this.playBtnMbr.left;
			const top = this.playBtnMbr.top;

			ctx.fillStyle = "white";
			ctx.beginPath();
			ctx.moveTo(left, top);
			ctx.lineTo(left + playBtnSize, top + playBtnSize / 2);
			ctx.lineTo(left, top + playBtnSize);
			ctx.closePath();
			ctx.fill();
		}

		ctx.restore();
	}

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("video-item");
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

		div.style.backgroundImage = this.preview
			? `url(${this.preview.src})`
			: `url(${getPlaceholderVideo(this.board).src})`;

		div.id = this.id;
		div.style.width = `${this.videoDimension.width}px`;
		div.style.height = `${this.videoDimension.height}px`;
		div.style.transformOrigin = "top left";
		div.style.transform = transform;
		div.style.position = "absolute";
		div.style.backgroundSize = "cover";

		return div;
	}

	serialize(): VideoItemData {
		return {
			itemType: "Video",
			url: this.url,
			videoDimension: this.videoDimension,
			transformation: this.transformation.serialize(),
		};
	}

	deserialize(data: Partial<VideoItemData>): VideoItem {
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		if (data.url) {
			if (SETTINGS.getYouTubeId(data.url)) {
				this.setUrl(undefined, data.url);
			} else {
				this.setUrl(data.url);
			}
		}
		if (this.isStorageUrl) {
			this.video.src = this.url;
		}
		return this;
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "Transformation":
				this.transformation.apply(op);
				break;
			case "LinkTo":
				this.linkTo.apply(op);
				break;
			case "Video":
				this.subject.publish(this);
				break;
		}
	}

	emit(operation: Operation): void {
		if (this.events) {
			const command = new VideoCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	setId(id: string): this {
		this.id = id;
		this.transformation.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	private shootLoadCallbacks(): void {
		while (this.loadCallbacks.length > 0) {
			this.loadCallbacks.shift()!(this);
		}
	}

	private shootBeforeLoadCallbacks(): void {
		while (this.beforeLoadCallbacks.length > 0) {
			this.beforeLoadCallbacks.shift()!(this);
		}
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
		return undefined;
	}

	download() {
		if (this.isStorageUrl) {
			const linkElem = document.createElement("a");
			linkElem.href = this.url;
			linkElem.setAttribute("download", "video.mp4");
			linkElem.click();
		}
	}
}
