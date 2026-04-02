import type { Events, Operation } from "Events";
import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { Transformation } from "../Transformation/Transformation";
import { TransformationData, DefaultTransformationData } from "../Transformation/TransformationData";
import { Board } from "Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { Path } from "../Path/Path";
import { Point } from "Items/Point/Point";
import { Line } from "Items/Line/Line";
import { conf } from "Settings";
import { AudioCommand } from "Items/Audio/AudioCommand";
import { BaseItem, SerializedItemData } from "Items/BaseItem/BaseItem";
import { registerItem } from "Items/RegisterItem";

export interface AudioItemData {
  itemType: "Audio";
  url: string;
  transformation: TransformationData;
  extension?: string;
  [key: string]: unknown;
}

export class AudioItem extends BaseItem<AudioItem> {
  readonly itemType = "Audio";
  parent = "Board";
  readonly subject = new Subject<AudioItem>();
  loadCallbacks: ((audio: AudioItem) => void)[] = [];
  beforeLoadCallbacks: ((audio: AudioItem) => void)[] = [];
  transformationRenderBlock?: boolean = undefined;
  private url = "";
  private isPlaying = false;
  private currentTime = 0;
  private extension?: string;

  constructor(
    board: Board,
    id = "",
  ) {
    super(board, id);
    this.linkTo.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });
    this.mbr.right = this.mbr.left + conf.AUDIO_DIMENSIONS.width;
    this.mbr.bottom = this.mbr.top + conf.AUDIO_DIMENSIONS.height;
    this.shouldUseCustomRender = true;
  }

  setCurrentTime(time: number) {
    this.currentTime = time;
  }

  getCurrentTime() {
    return this.currentTime;
  }


  doOnceBeforeOnLoad = (callback: (audio: AudioItem) => void): void => {
    this.loadCallbacks.push(callback);
  };

  doOnceOnLoad = (callback: (audio: AudioItem) => void): void => {
    this.loadCallbacks.push(callback);
  };

  setIsPlaying(isPlaying: boolean) {
    this.isPlaying = isPlaying;
    this.shouldRenderOutsideViewRect = isPlaying;
    this.subject.publish(this);
  }

  getIsPlaying() {
    return this.isPlaying;
  }


  getStorageId() {
    return this.url.split("/").pop();
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
      this.transformation.getMatrixData();
    this.mbr.left = translateX;
    this.mbr.top = translateY;
    this.mbr.right = this.mbr.left + conf.AUDIO_DIMENSIONS.width * scaleX;
    this.mbr.bottom = this.mbr.top + conf.AUDIO_DIMENSIONS.height * scaleY;
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    const ctx = context.ctx;
    const radius = 12 * this.transformation.getScale().x;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    ctx.beginPath();
    ctx.moveTo(this.mbr.left + radius, this.mbr.top);
    ctx.lineTo(this.mbr.left + this.getWidth() - radius, this.mbr.top);
    ctx.quadraticCurveTo(
      this.mbr.left + this.getWidth(),
      this.mbr.top,
      this.mbr.left + this.getWidth(),
      this.mbr.top + radius
    );
    ctx.lineTo(
      this.mbr.left + this.getWidth(),
      this.mbr.top + this.getHeight() - radius
    );
    ctx.quadraticCurveTo(
      this.mbr.left + this.getWidth(),
      this.mbr.top + this.getHeight(),
      this.mbr.left + this.getWidth() - radius,
      this.mbr.top + this.getHeight()
    );
    ctx.lineTo(this.mbr.left + radius, this.mbr.top + this.getHeight());
    ctx.quadraticCurveTo(
      this.mbr.left,
      this.mbr.top + this.getHeight(),
      this.mbr.left,
      this.mbr.top + this.getHeight() - radius
    );
    ctx.lineTo(this.mbr.left, this.mbr.top + radius);
    ctx.quadraticCurveTo(this.mbr.left, this.mbr.top, this.mbr.left + radius, this.mbr.top);
    ctx.closePath();

    ctx.fill();
    ctx.restore();
  }

  serialize(): SerializedItemData<AudioItemData> {
    return {
      id: this.id,
      itemType: "Audio",
      url: this.url,
      transformation: this.transformation.serialize(),
      extension: this.extension,
    };
  }

  deserialize(data: SerializedItemData<AudioItemData> | AudioItemData): this {
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
      this.updateMbr();
    }
    if (data.url) {
      this.url = data.url;
    }
    if (data.extension) {
      this.extension = data.extension;
    }

    return this;
  }

  apply(op: Operation): void {
    switch (op.class) {
      case "Transformation":
        super.apply(op);
        this.updateMbr();
        break;
      case "Audio":
        if (op.method === "setUrl") {
          this.url = op.url;
        }
        break;
      default:
        super.apply(op);
        return;
    }
    this.subject.publish(this);
  }

  emit(operation: Operation): void {
    if (this.board.events) {
      const command = new AudioCommand([this], operation);
      command.apply();
      this.board.events.emit(operation, command);
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
      const linkElem = conf.documentFactory.createElement(
        "a"
      ) as HTMLAnchorElement;
      linkElem.href = this.url;
      linkElem.setAttribute(
        "download",
        `${this.board.getBoardId()}.${this.extension}`
      );
      linkElem.click();
    }
  }

  onRemove() {
    const storageId = this.getStorageId();
    if (storageId) {
      conf.hooks.beforeMediaRemove([storageId], this.board.getBoardId());
    }
    super.onRemove();
  }
}

export const DefaultAudioItemData: AudioItemData = {
  itemType: "Audio",
  transformation: new DefaultTransformationData(),
  url: "",
};

registerItem({
  item: AudioItem,
  defaultData: DefaultAudioItemData,
});
