import { Events, Operation } from "Board/Events";
import { Subject } from "shared/Subject";
import { DrawingContext } from "../DrawingContext";
import { Mbr } from "../Mbr";
import { Transformation } from "../Transformation";
import { TransformationData } from "../Transformation/TransformationData";
import { Board } from "Board/Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { getYouTubeThumbnail, storageURL } from "./VideoHelpers";
import { DocumentFactory } from "Board/api/DocumentFactory";
import { Paths, Path } from "../Path";
import { VideoCommand } from "Board/Items/Video/VideoCommand";
import { Point } from "Board/Items/Point/Point";
import { Line } from "Board/Items/Line/Line";
import { SETTINGS } from "Board/Settings";
import { getPlaceholderImage } from "Board/Items/Image/Image";

export interface VideoItemData {
	itemType: "Video";
	url: string;
	videoDimension: Dimension;
	transformation: TransformationData;
	isStorageUrl: boolean;
}

export interface Dimension {
	height: number;
	width: number;
}

export interface VideoConstructorData {
	url: string;
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
	private url = "";
	private isStorageUrl = false;
	videoDimension: Dimension;
	board: Board;
	private isPlaying = false;
	private shouldShowControls = false;
	private playBtnMbr: Mbr = new Mbr();

	constructor(
		{ url, videoDimension }: VideoConstructorData,
		board: Board,
		private events?: Events,
		private id = "",
		preview?: HTMLImageElement,
	) {
		super();
		this.preview = getPlaceholderImage(board, videoDimension);
		this.linkTo = new LinkTo(this.id, events);
		this.board = board;
		if (preview) {
			this.preview = preview;
		}
		this.isStorageUrl = !SETTINGS.getYouTubeId(url);
		this.setUrl(url);
		this.createVideo();
		this.videoDimension = videoDimension;
		this.transformation = new Transformation(id, events);
		this.linkTo.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.transformation.subject.subscribe(this.onTransform);
	}

	private getYouTubePreview() {
		const videoId = SETTINGS.getYouTubeId(this.url);
		if (videoId) {
			this.preview.src = getYouTubeThumbnail(videoId, "maxres");
		}
	}

	private createVideo() {
		if (this.isStorageUrl) {
			this.video = document.createElement("video");
			this.video.crossOrigin = "anonymous";
			this.video.muted = true;
			this.video.onloadedmetadata = this.onLoadedMetadata;
			this.video.onerror = this.onError;
			this.video.src = this.url;
		}
	}

	private captureFirstFrame() {
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

	setUrl(url: string): void {
		if (this.isStorageUrl) {
			try {
				const newUrl = new URL(url);
				this.url = `${window.location.origin}${newUrl.pathname}`;
			} catch (_) {
				this.url = `${storageURL}/${url}`;
			}
		} else {
			this.url = url;
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
		if (SETTINGS.getYouTubeId(this.url)) {
			this.shootLoadCallbacks();
			return;
		}
		this.captureFirstFrame();
		this.shootBeforeLoadCallbacks();
	};

	onError = (_error: any) => {
		this.preview = getPlaceholderImage(this.board, this.videoDimension);
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
		if (this.transformationRenderBlock || !this.preview.complete) {
			return;
		}
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
			: `url(${getPlaceholderImage(this.board).src})`;

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
			isStorageUrl: this.isStorageUrl,
		};
	}

	deserialize(data: Partial<VideoItemData>): VideoItem {
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		if (data.isStorageUrl) {
			this.isStorageUrl = data.isStorageUrl;
		}
		if (data.url) {
			this.setUrl(data.url);
			if (!this.isStorageUrl) {
				this.getYouTubePreview();
			}
		}
		if (this.isStorageUrl) {
			this.createVideo();
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
