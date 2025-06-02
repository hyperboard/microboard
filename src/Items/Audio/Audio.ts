import { Events, Operation } from 'Events';
import { Subject } from 'Subject';
import { DrawingContext } from '../DrawingContext';
import { Mbr } from '../Mbr';
import { Transformation } from '../Transformation';
import { TransformationData } from '../Transformation/TransformationData';
import { Board } from 'Board';
import { LinkTo } from '../LinkTo/LinkTo';
import { DocumentFactory } from 'api/DocumentFactory';
import { Path } from '../Path';
import { Point } from 'Items/Point/Point';
import { Line } from 'Items/Line/Line';
import { conf } from 'Settings';
import { AudioCommand } from 'Items/Audio/AudioCommand';

export interface AudioItemData {
	itemType: 'Audio';
	url: string;
	transformation: TransformationData;
	isStorageUrl: boolean;
	extension?: string;
}

export class AudioItem extends Mbr {
	readonly itemType = 'Audio';
	parent = 'Board';
	readonly transformation: Transformation;
	readonly linkTo: LinkTo;
	readonly subject = new Subject<AudioItem>();
	loadCallbacks: ((audio: AudioItem) => void)[] = [];
	beforeLoadCallbacks: ((audio: AudioItem) => void)[] = [];
	transformationRenderBlock?: boolean = undefined;
	private url = '';
	board: Board;
	private isPlaying = false;
	private currentTime = 0;
	private isStorageUrl = true;

	constructor(
		board: Board,
		isStorageUrl: boolean,
		url?: string,
		private events?: Events,
		private id = '',
		private extension?: string
	) {
		super();
		this.linkTo = new LinkTo(this.id, events);
		this.board = board;
		this.isStorageUrl = isStorageUrl;
		if (url) {
			this.applyUrl(url);
		}
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

	getIsStorageUrl(): boolean {
		return this.isStorageUrl;
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

	applyUrl(url: string): void {
		if (this.isStorageUrl) {
			try {
				const newUrl = new URL(url);
				this.url = `${window.location.origin}${newUrl.pathname}`;
			} catch (_) {
				// this.url = `${storageURL}/${url}`;
			}
		} else {
			this.url = url;
		}
	}

	setUrl(url: string): void {
		this.emit({
			class: 'Audio',
			method: 'setUrl',
			item: [this.getId()],
			url,
		});
	}

	getStorageId() {
		return this.url.split('/').pop();
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
		const { translateX, translateY, scaleX, scaleY } = this.transformation.matrix;
		this.left = translateX;
		this.top = translateY;
		this.right = this.left + conf.AUDIO_DIMENSIONS.width * scaleX;
		this.bottom = this.top + conf.AUDIO_DIMENSIONS.height * scaleY;
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		const ctx = context.ctx;
		const radius = 12 * this.transformation.getScale().x;

		ctx.save();
		ctx.globalCompositeOperation = 'destination-out';

		ctx.beginPath();
		ctx.moveTo(this.left + radius, this.top);
		ctx.lineTo(this.left + this.getWidth() - radius, this.top);
		ctx.quadraticCurveTo(
			this.left + this.getWidth(),
			this.top,
			this.left + this.getWidth(),
			this.top + radius
		);
		ctx.lineTo(this.left + this.getWidth(), this.top + this.getHeight() - radius);
		ctx.quadraticCurveTo(
			this.left + this.getWidth(),
			this.top + this.getHeight(),
			this.left + this.getWidth() - radius,
			this.top + this.getHeight()
		);
		ctx.lineTo(this.left + radius, this.top + this.getHeight());
		ctx.quadraticCurveTo(
			this.left,
			this.top + this.getHeight(),
			this.left,
			this.top + this.getHeight() - radius
		);
		ctx.lineTo(this.left, this.top + radius);
		ctx.quadraticCurveTo(this.left, this.top, this.left + radius, this.top);
		ctx.closePath();

		ctx.fill();
		ctx.restore();
	}

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement('audio-item');
		const { translateX, translateY, scaleX, scaleY } = this.transformation.matrix;
		const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

		div.id = this.getId();
		div.style.width = `${conf.AUDIO_DIMENSIONS.width}px`;
		div.style.height = `${conf.AUDIO_DIMENSIONS.height}px`;
		div.style.transformOrigin = 'top left';
		div.style.transform = transform;
		div.style.position = 'absolute';
		div.setAttribute('audio-url', this.getUrl());
		if (this.extension) {
			div.setAttribute('extension', this.extension);
		}
		if (this.isStorageUrl) {
			div.setAttribute('is-storage-url', 'true');
		}
		div.setAttribute('data-link-to', '');

		return div;
	}

	serialize(): AudioItemData {
		return {
			itemType: 'Audio',
			url: this.url,
			transformation: this.transformation.serialize(),
			isStorageUrl: this.isStorageUrl,
			extension: this.extension,
		};
	}

	deserialize(data: Partial<AudioItemData>): AudioItem {
		if (data.isStorageUrl) {
			this.isStorageUrl = data.isStorageUrl;
		}
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
			case 'Transformation':
				this.transformation.apply(op);
				break;
			case 'LinkTo':
				this.linkTo.apply(op);
				break;
			case 'Audio':
				if (op.method === 'setUrl') {
					this.applyUrl(op.url);
				}
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
			true
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

	getExtension(): string | undefined {
		return this.extension;
	}

	download() {
		if (this.extension) {
			const linkElem = conf.documentFactory.createElement('a') as HTMLAnchorElement;
			linkElem.href = this.url;
			linkElem.setAttribute('download', `${this.board.getBoardId()}.${this.extension}`);
			linkElem.click();
		}
	}
}
