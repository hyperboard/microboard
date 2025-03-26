import { Events, Operation, Command } from "Board/Events";
import { Subject } from "shared/Subject";
import { DrawingContext } from "../DrawingContext";
import { Mbr } from "../Mbr";
import { Matrix, Transformation } from "../Transformation";
import { TransformationData } from "../Transformation/TransformationData";
import { Board } from "Board/Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { DocumentFactory } from "Board/api/DocumentFactory";
import { Path, Paths } from "../Path";
import { Point } from "Board/Items/Point/Point";
import { Line } from "Board/Items/Line/Line";
import { conf } from "Board/Settings";
import { AudioCommand } from "Board/Items/Audio/AudioCommand";
import { CubicBezier } from "Board/Items/Curve/Curve";

export interface AudioItemData {
	itemType: "Audio";
	url: string;
	transformation: TransformationData;
	extension: "mp3" | "wav";
}

export class AudioItem extends Mbr {
	readonly itemType = "Audio";
	parent = "Board";
	readonly transformation: Transformation;
	readonly linkTo: LinkTo;
	readonly subject = new Subject<AudioItem>();
	loadCallbacks: ((audio: AudioItem) => void)[] = [];
	beforeLoadCallbacks: ((audio: AudioItem) => void)[] = [];
	transformationRenderBlock?: boolean = undefined;
	private url = "";
	board: Board;
	private isPlaying = false;
	private currentTime = 0;
	private path: Path | Paths;

	constructor(
		url: string,
		board: Board,
		private events?: Events,
		private id = "",
		private extension: "mp3" | "wav" = "mp3",
	) {
		super();
		this.linkTo = new LinkTo(this.id, events);
		this.board = board;
		this.setUrl(url);
		this.transformation = new Transformation(id, events);
		this.linkTo.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.transformation.subject.subscribe(this.onTransform);
		this.right = this.left + conf.AUDIO_DIMENSIONS.width;
		this.bottom = this.top + conf.AUDIO_DIMENSIONS.height;
	}

	setCurrentTime(time: number) {
		this.currentTime = time;
	}

	getCurrentTime() {
		return this.currentTime;
	}

	onTransform = (): void => {
		this.updateMbr();
		this.subject.publish(this);
	};

	doOnceBeforeOnLoad = (callback: (audio: AudioItem) => void): void => {
		this.loadCallbacks.push(callback);
	};

	doOnceOnLoad = (callback: (audio: AudioItem) => void): void => {
		this.loadCallbacks.push(callback);
	};

	setIsPlaying(isPlaying: boolean) {
		this.isPlaying = isPlaying;
		this.subject.publish(this);
	}

	getIsPlaying() {
		return this.isPlaying;
	}

	setUrl(url: string): void {
		try {
			const newUrl = new URL(url);
			this.url = `${window.location.origin}${newUrl.pathname}`;
		} catch (_) {
			// this.url = `${storageURL}/${url}`;
		}
	}

	getUrl() {
		return this.url;
	}

	onLoad = async (): Promise<void> => {
		this.shootBeforeLoadCallbacks();
		this.updateMbr();
		this.subject.publish(this);
		this.shootLoadCallbacks();
	};

	onError = (_error: any) => {
		this.updateMbr();
		this.subject.publish(this);
		this.shootLoadCallbacks();
	};

	updateMbr(): void {
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		this.left = translateX;
		this.top = translateY;
		this.right = this.left + conf.AUDIO_DIMENSIONS.width * scaleX;
		this.bottom = this.top + conf.AUDIO_DIMENSIONS.height * scaleY;
		this.updatePath();
	}

	updatePath(): void {
		this.path = createAudioPath(
			this.getMbr(),
			this.transformation?.matrix || new Matrix(),
		);
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.path.render(context);
	}

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("audio-item");
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

		div.id = this.getId();
		div.style.width = `${conf.AUDIO_DIMENSIONS.width}px`;
		div.style.height = `${conf.AUDIO_DIMENSIONS.height}px`;
		div.style.transformOrigin = "top left";
		div.style.transform = transform;
		div.style.position = "absolute";
		div.setAttribute("audio-url", this.getUrl());
		div.setAttribute("extension", this.extension);
		div.setAttribute("data-link-to", "");

		return div;
	}

	serialize(): AudioItemData {
		return {
			itemType: "Audio",
			url: this.url,
			transformation: this.transformation.serialize(),
			extension: this.extension,
		};
	}

	deserialize(data: Partial<AudioItemData>): AudioItem {
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		if (data.url) {
			this.setUrl(data.url);
		}
		if (data.extension) {
			this.extension = data.extension;
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
			case "Audio":
				this.subject.publish(this);
				break;
		}
	}

	emit(operation: Operation): void {
		if (this.events) {
			const command = new AudioCommand([this], operation);
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

	getPath(): Path {
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
		const linkElem = document.createElement("a");
		linkElem.href = this.url;
		linkElem.setAttribute("download", `${this.url}.${this.extension}`);
		linkElem.click();
	}
}

const convexity = 2;
const nearBreakpoint = 6;
const farBreakpoint = 12;

export const createAudioPath = (mbr: Mbr, matrix: Matrix) => {
	const width = mbr.getWidth();
	const height = mbr.getHeight();
	const movementLinesLeft = width * 0.46;
	const movementLinesRight = width * 0.54;
	return new Paths([
		new Path(
			[
				new CubicBezier(
					new Point(0, farBreakpoint),
					new Point(0, nearBreakpoint - convexity),
					new Point(farBreakpoint, 0),
					new Point(nearBreakpoint - convexity, 0),
				),
				new Line(
					new Point(farBreakpoint, 0),
					new Point(width - farBreakpoint, 0),
				),
				new CubicBezier(
					new Point(width - farBreakpoint, 0),
					new Point(width - nearBreakpoint + convexity, 0),
					new Point(width, farBreakpoint),
					new Point(width, nearBreakpoint - convexity),
				),
				new Line(
					new Point(width, farBreakpoint),
					new Point(width, height - farBreakpoint),
				),
				new CubicBezier(
					new Point(width, height - farBreakpoint),
					new Point(width, height - nearBreakpoint - convexity),
					new Point(width - farBreakpoint, height),
					new Point(width - nearBreakpoint + convexity, height),
				),
				new Line(
					new Point(width - farBreakpoint, height),
					new Point(farBreakpoint, height),
				),
				new CubicBezier(
					new Point(farBreakpoint, height),
					new Point(nearBreakpoint - convexity, height),
					new Point(0, height - farBreakpoint),
					new Point(0, height - nearBreakpoint - convexity),
				),
				new Line(
					new Point(0, height - farBreakpoint),
					new Point(0, farBreakpoint),
				),
			],
			true,
			"rgb(255, 255, 255)",
			"rgba(222, 224, 227, 1)",
		),
		new Path(
			[
				new Line(
					new Point(movementLinesLeft, 3 * matrix.scaleX),
					new Point(movementLinesRight, 3 * matrix.scaleX),
				),
			],
			false,
			"none",
			"rgba(222, 224, 227, 1)",
			"solid",
			6,
		),
		new Path(
			[
				new Line(
					new Point(movementLinesLeft, 10 * matrix.scaleY),
					new Point(movementLinesRight, 10 * matrix.scaleY),
				),
			],
			false,
			"none",
			"rgba(222, 224, 227, 1)",
			"solid",
			6,
		),
	]).getTransformed(new Matrix(matrix.translateX, matrix.translateY));
};
