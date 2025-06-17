import { DocumentFactory } from "api/DocumentFactory";
import { Board } from "Board";
import { Events, Operation } from "Events";
import { Point } from "Items";
import { DrawingContext } from "Items/DrawingContext";
import { Line } from "Items/Line";
import { LinkTo } from "Items/LinkTo/LinkTo";
import { Mbr } from "Items/Mbr";
import { Path, Paths } from "Items/Path";
import { TransformationData, Transformation } from "Items/Transformation";
import { conf } from "Settings";
import { Subject } from "Subject";
import { VideoCommand } from "./VideoCommand";
import { BaseItem } from "Items/BaseItem/BaseItem";

export interface VideoItemData {
  itemType: "Video";
  url?: string;
  videoDimension: Dimension;
  transformation: TransformationData;
  isStorageUrl: boolean;
  previewUrl?: string;
  extension: string;
}

export interface Dimension {
  height: number;
  width: number;
}

export interface VideoConstructorData {
  url?: string;
  videoDimension: Dimension;
  previewUrl?: string;
}

const VIDEO_ICON_SRC =
  "data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 22 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15 0C15.2652 0 15.5196 0.105357 15.7071 0.292893C15.8946 0.48043 16 0.734784 16 1V5.2L21.213 1.55C21.288 1.49746 21.3759 1.4665 21.4672 1.4605C21.5586 1.4545 21.6498 1.4737 21.731 1.51599C21.8122 1.55829 21.8802 1.62206 21.9276 1.70035C21.9751 1.77865 22.0001 1.86846 22 1.96V14.04C22.0001 14.1315 21.9751 14.2214 21.9276 14.2996C21.8802 14.3779 21.8122 14.4417 21.731 14.484C21.6498 14.5263 21.5586 14.5455 21.4672 14.5395C21.3759 14.5335 21.288 14.5025 21.213 14.45L16 10.8V15C16 15.2652 15.8946 15.5196 15.7071 15.7071C15.5196 15.8946 15.2652 16 15 16H1C0.734784 16 0.48043 15.8946 0.292893 15.7071C0.105357 15.5196 0 15.2652 0 15V1C0 0.734784 0.105357 0.48043 0.292893 0.292893C0.48043 0.105357 0.734784 0 1 0H15ZM14 2H2V14H14V2ZM6.4 4.829C6.47611 4.82879 6.55069 4.8503 6.615 4.891L10.97 7.663C11.0266 7.69917 11.0731 7.749 11.1054 7.80789C11.1376 7.86679 11.1545 7.93285 11.1545 8C11.1545 8.06715 11.1376 8.13321 11.1054 8.19211C11.0731 8.251 11.0266 8.30083 10.97 8.337L6.615 11.11C6.55434 11.1487 6.48438 11.1703 6.41248 11.1725C6.34059 11.1748 6.26941 11.1576 6.20646 11.1228C6.14351 11.088 6.0911 11.0368 6.05477 10.9747C6.01844 10.9127 5.99951 10.8419 6 10.77V5.23C6 5.009 6.18 4.83 6.4 4.83V4.829ZM20 4.84L16 7.64V8.358L20 11.158V4.84Z' fill='%23FFFFFF'/%3E%3C/svg%3E";
const videoIcon = conf.documentFactory.createElement("img") as HTMLImageElement;
videoIcon.src = VIDEO_ICON_SRC;

export const createPlaceholderImage = (
  width: number,
  height: number
): HTMLImageElement => {
  const canvas = conf.documentFactory.createElement(
    "canvas"
  ) as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "rgba(229, 229, 234, 1)";
    ctx.fillRect(0, 0, width, height);

    const iconSize = Math.min(width, height) * 0.3;
    const iconX = (width - iconSize) / 2;
    const iconY = (height - iconSize) / 2;

    ctx.drawImage(videoIcon, iconX, iconY, iconSize * 1.375, iconSize);
  }

  const image = new Image();
  image.src = canvas.toDataURL();
  return image;
};

export class VideoItem extends BaseItem {
  readonly itemType = "Video";
  parent = "Board";
  preview: HTMLImageElement;
  readonly transformation: Transformation;
  readonly linkTo: LinkTo;
  readonly subject = new Subject<VideoItem>();
  loadCallbacks: ((video: VideoItem) => void)[] = [];
  beforeLoadCallbacks: ((video: VideoItem) => void)[] = [];
  transformationRenderBlock?: boolean = undefined;
  private url = "";
  private previewUrl = "";
  private isStorageUrl = false;
  videoDimension: Dimension;
  board: Board;
  private isPlaying = false;
  private shouldShowControls = false;
  private playBtnMbr: Mbr = new Mbr();
  private currentTime = 0;

  constructor(
    { url, videoDimension, previewUrl }: VideoConstructorData,
    board: Board,
    private events?: Events,
    id = "",
    private extension: string = "mp4"
  ) {
    super(board, id);
    this.isStorageUrl = !conf.getYouTubeId(url);
    this.preview = createPlaceholderImage(
      videoDimension.width,
      videoDimension.height
    );
    this.linkTo = new LinkTo(this.id, events);
    this.board = board;
    // img storage link or youtube preview url
    if (previewUrl) {
      this.previewUrl = previewUrl;
      this.setPreview(this.preview, previewUrl);
    }
    this.preview.onload = this.onLoad;
    this.preview.onerror = this.onError;
    if (url) {
      this.setUrl(url);
    }
    this.videoDimension = videoDimension;
    this.transformation = new Transformation(id, events);
    this.linkTo.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });
    this.transformation.subject.subscribe(this.onTransform);
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

  doOnceBeforeOnLoad = (callback: (video: VideoItem) => void): void => {
    this.loadCallbacks.push(callback);
  };

  doOnceOnLoad = (callback: (video: VideoItem) => void): void => {
    this.loadCallbacks.push(callback);
  };

  getStorageId() {
    return this.url.split("/").pop();
  }

  getIsStorageUrl() {
    return this.isStorageUrl;
  }

  setVideoData({ previewUrl, url }: { previewUrl: string; url: string }) {
    this.emit({
      class: "Video",
      item: [this.id],
      method: "updateVideoData",
      data: { previewUrl, url, videoDimension: this.videoDimension },
    });
  }

  applyVideoData({
    previewUrl = "",
    url = "",
  }: {
    previewUrl?: string;
    url?: string;
  }): void {
    this.previewUrl = previewUrl;
    this.setPreview(this.preview, previewUrl);
    this.setUrl(url);
  }

  setIsPlaying(isPlaying: boolean) {
    this.shouldUseCustomRender = isPlaying;
    this.subject.publish(this);
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
        // this.url = `${storageURL}/${url}`;
      }
    } else {
      this.url = url;
    }
  }

  private setPreview(image: HTMLImageElement, previewUrl: string): void {
    if (this.isStorageUrl) {
      try {
        const newUrl = new URL(previewUrl);
        image.src = `${window.location.origin}${newUrl.pathname}`;
      } catch (_) {
        // image.src = `${storageURL}/${previewUrl}`;
      }
    } else {
      image.src = previewUrl;
    }

    image.onload = () => {
      this.preview = image;
    };
  }

  setPreviewImage(image: HTMLImageElement): void {
    this.preview = image;
    this.preview.onload = this.onLoad;
    this.preview.onerror = () => {
      const defaultPreview = new Image();
      defaultPreview.src = this.getPreviewUrl();
      this.preview = defaultPreview;
      this.preview.onload = this.onLoad;
      this.preview.onerror = this.onError;
      this.subject.publish(this);
    };
    this.subject.publish(this);
  }

  getPreviewUrl() {
    return this.previewUrl;
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
    this.preview = createPlaceholderImage(
      this.videoDimension.width,
      this.videoDimension.height
    );
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
      this.bottom - this.getHeight() / 2 + scaledPlayBtn / 2
    );
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock || !this.preview.complete) {
      return;
    }
    const ctx = context.ctx;
    if (this.shouldUseCustomRender) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(this.left, this.top, this.getWidth(), this.getHeight());
      ctx.restore();
      return;
    }
    ctx.save();
    this.transformation.matrix.applyToContext(ctx);
    ctx.drawImage(this.preview, 0, 0);

    if (this.shouldShowControls && this.previewUrl) {
      ctx.restore();
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(this.left, this.top, this.getWidth(), this.getHeight());

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

    div.style.backgroundImage = this.previewUrl
      ? `url(${this.previewUrl})`
      : `url(${
          createPlaceholderImage(
            this.videoDimension.width,
            this.videoDimension.height
          ).src
        })`;

    div.id = this.getId();
    div.style.width = `${this.videoDimension.width}px`;
    div.style.height = `${this.videoDimension.height}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.style.backgroundSize = "cover";
    div.setAttribute("video-url", this.getUrl());
    div.setAttribute("preview-url", this.getPreviewUrl());
    div.setAttribute("extension", this.extension);
    div.setAttribute("is-storage-url", this.isStorageUrl ? "1" : "");
    div.setAttribute("data-link-to", "");

    return div;
  }

  serialize(): VideoItemData {
    return {
      itemType: "Video",
      url: this.url,
      videoDimension: this.videoDimension,
      transformation: this.transformation.serialize(),
      isStorageUrl: this.isStorageUrl,
      previewUrl: this.previewUrl,
      extension: this.extension,
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
    }
    if (data.extension) {
      this.extension = data.extension;
    }

    this.preview = createPlaceholderImage(
      data.videoDimension?.width || 100,
      data.videoDimension?.height || 100
    );

    const storageImage = new Image();

    storageImage.onload = () => {
      this.onLoad();
    };

    storageImage.onerror = this.onError;
    if (data.previewUrl) {
      this.setPreview(storageImage, data.previewUrl);
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
        if (op.method === "updateVideoData") {
          this.applyVideoData({
            url: op.data.url,
            previewUrl: op.data.previewUrl,
          });
        }
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

  download() {
    if (this.isStorageUrl) {
      const linkElem = document.createElement("a");
      linkElem.href = this.url;
      linkElem.setAttribute(
        "download",
        `${this.board.getBoardId()}.${this.extension}`
      );
      linkElem.click();
    }
  }
}
