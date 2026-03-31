import { Events, Operation } from "Events";
import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { Line } from "../Line/Line";
import { Path } from "../Path/Path";
import { Paths } from "../Path/Paths";
import { Point } from "../Point/Point";
import { Transformation } from "../Transformation/Transformation";
import { TransformationData } from "../Transformation/TransformationData";
import { Placeholder } from "../Placeholder/Placeholder";
import { transformOps } from "../Transformation/transformOps";
import { Board } from "Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { scaleElementBy, translateElementBy } from "HTMLRender/HTMLRender";
import { ImageOperation } from "./ImageOperation";
import { ImageCommand } from "./ImageCommand";
import { DocumentFactory } from "api/DocumentFactory";
import { conf } from "Settings";
import { BaseItem, SerializedItemData } from "Items/BaseItem/BaseItem";
import {getMediaSignedUrl} from "api/MediaHelpers";

export interface ImageItemData {
  itemType: "Image";
  storageLink: string;
  imageDimension: Dimension;
  transformation: TransformationData;
  linkTo?: string;
  [key: string]: unknown;
}

export interface Dimension {
  height: number;
  width: number;
}

// smell have to redo without document
export function getPlaceholderImage(
  board: Board,
  imageDimension?: Dimension
): HTMLImageElement {
  const placeholderCanvas = conf.documentFactory.createElement("canvas") as HTMLCanvasElement;
  const placeholderContext = placeholderCanvas.getContext(
    "2d"
  ) as CanvasRenderingContext2D; // this does not fail

  const context = new DrawingContext(board.camera, placeholderContext);

  const placeholder = new Placeholder(board);

  if (imageDimension) {
    placeholderCanvas.width = imageDimension.width;
    placeholderCanvas.height = imageDimension.height;

    placeholder.apply(transformOps.scaleTo(placeholder,
      imageDimension.width / 100,
      imageDimension.height / 100
    ));
  } else {
    placeholderCanvas.width = 250;
    placeholderCanvas.height = 50;
    placeholder.apply(transformOps.scaleTo(placeholder, 250 / 100, 50 / 100));
  }

  // placeholder.render(context); TODO: had to comment out to run in node. look if it breaks something

  const placeholderImage = new Image();
  placeholderImage.src = placeholderCanvas.toDataURL();
  return placeholderImage;
}

export interface ImageConstructorData {
  base64?: string;
  storageLink: string;
  imageDimension: Dimension;
}

export class ImageItem extends BaseItem<ImageItem> {
  readonly itemType = "Image";
  parent = "Board";
  image: HTMLImageElement;
  readonly subject = new Subject<ImageItem>();
  loadCallbacks: ((image: ImageItem) => void)[] = [];
  beforeLoadCallbacks: ((image: ImageItem) => void)[] = [];
  transformationRenderBlock?: boolean = undefined;
  private storageLink!: string;
  private signedUrl = "";
  imageDimension: Dimension;
  board: Board;

  constructor(
    { base64, storageLink, imageDimension }: ImageConstructorData,
    board: Board,
    private events?: Events,
    id = "",
  ) {
    super(board, id);
    this.board = board;
    this.setStorageLink(storageLink);
    this.imageDimension = imageDimension;
    this.image = new Image();
    this.setImage(new Image());
    if (typeof base64 === "string") {
      this.image.src = base64;
    }
  }

  private setImage(image: HTMLImageElement): void {
    this.image = image;
    this.image.crossOrigin = "anonymous";
    this.image.onload = this.onLoad;
    this.image.onerror = this.onError;
    this.updateMbr();
  }

  private async setStorageLink(link: string) {
    this.storageLink = link;
    this.signedUrl = await getMediaSignedUrl(link) || "";
    if (!this.signedUrl) {
      const canvas = conf.documentFactory.createElement("canvas") as HTMLCanvasElement;
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // background
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, 100, 100);
        ctx.strokeStyle = "#bdbdbd";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 98, 98);
        // broken image icon (centered, 40x32)
        const x = 30, y = 34;
        ctx.strokeStyle = "#9e9e9e";
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.strokeRect(x, y, 40, 32);
        // mountain left
        ctx.beginPath();
        ctx.moveTo(x, y + 32);
        ctx.lineTo(x + 14, y + 14);
        ctx.lineTo(x + 24, y + 24);
        ctx.stroke();
        // mountain right
        ctx.beginPath();
        ctx.moveTo(x + 24, y + 24);
        ctx.lineTo(x + 32, y + 16);
        ctx.lineTo(x + 40, y + 32);
        ctx.stroke();
        // sun circle
        ctx.beginPath();
        ctx.arc(x + 31, y + 10, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      const placeholderImg = new Image();
      placeholderImg.src = canvas.toDataURL();
      this.setImage(placeholderImg);
      this.updateMbr();
      this.subject.publish(this);
      this.shootLoadCallbacks();
      return;
    }
    this.image.src = this.signedUrl;
  }

  getStorageId() {
    return this.storageLink.split("/").pop();
  }

  handleError = (): void => {
    // Provide handling logic for errors
    console.error("Invalid dataUrl or image failed to load.");
    this.setImage(getPlaceholderImage(this.board, this.imageDimension));
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

  onError = (): void => {
    this.setImage(getPlaceholderImage(this.board, this.imageDimension));
    this.updateMbr();
    this.subject.publish(this);
    this.shootLoadCallbacks();
    this.image.onload = this.onLoad;
  };


  updateMbr(): void {
    const { translateX, translateY, scaleX, scaleY } =
      this.transformation.getMatrixData();
    const rotation = this.transformation.getRotation();
    const width = this.image.width * scaleX;
    const height = this.image.height * scaleY;
    if (rotation % 180 === 0) {
      this.left = translateX;
      this.top = translateY;
      this.right = this.left + width;
      this.bottom = this.top + height;
    } else {
      const centerX = translateX + width / 2;
      const centerY = translateY + height / 2;
      this.left = centerX - height / 2;
      this.top = centerY - width / 2;
      this.right = this.left + height;
      this.bottom = this.top + width;
    }
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

  serialize(): SerializedItemData<ImageItemData> {
    return {
      id: this.id,
      itemType: "Image",
      storageLink: this.storageLink,
      imageDimension: this.imageDimension,
      transformation: this.transformation.serialize(),
      linkTo: this.linkTo.serialize(),
    };
  }

  private setCoordinates(): void {
    const { translateX: coordX, translateY: coordY, scaleX: coordScaleX, scaleY: coordScaleY } = this.transformation.getMatrixData();
    this.left = coordX;
    this.top = coordY;
    this.right = this.left + this.image.width * coordScaleX;
    this.bottom = this.top + this.image.height * coordScaleY;
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

  deserialize(data: SerializedItemData<ImageItemData> | ImageItemData): this {
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
      this.updateMbr();
    }
    this.linkTo.deserialize(data.linkTo);
    this.image.onload = () => {
      this.setCoordinates();
      this.onLoad();
    };
    if (data.storageLink) {
      this.setStorageLink(data.storageLink);
    }

    if (this.image.src) {
      return this;
    }

    this.onError()
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


  apply(op: Operation): void {
    switch (op.class) {
      case "Transformation":
        super.apply(op);
        this.updateMbr();
        break;
      case "Image":
        if (op.method === "updateImageData") {
          if (op.data.base64) {
            this.image.src = op.data.base64;
          }
          this.setStorageLink(op.data.storageLink);
          this.imageDimension = op.data.imageDimension;
        }
        break;
      default:
        super.apply(op);
        return;
    }
    this.subject.publish(this);
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    const ctx = context.ctx;
    ctx.save();
    this.transformation.applyToContext(ctx);
    const rotation = this.transformation.getRotation();
    if (rotation !== 0) {
      const imgWidth = this.image.width || 0;
      const imgHeight = this.image.height || 0;

      ctx.translate(imgWidth / 2, imgHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-imgWidth / 2, -imgHeight / 2);
    }
    ctx.drawImage(this.image, 0, 0);
    ctx.restore();
    if (this.getLinkTo()) {
      const { top, right } = this.getMbr();
      this.linkTo.render(context, top, right, this.board.camera.getScale());
    }
  }

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = documentFactory.createElement("image-item");
    const { translateX, translateY, scaleX, scaleY } =
      this.transformation.getMatrixData();
    const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;


    div.style.backgroundImage = `url(${this.storageLink})`;

    div.id = this.getId();
    div.style.width = `${this.imageDimension.width}px`;
    div.style.height = `${this.imageDimension.height}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.style.backgroundSize = "cover";
    div.setAttribute("rotation", this.transformation.getRotation().toString());

    div.setAttribute("data-link-to", this.linkTo.serialize() || "");
    if (this.getLinkTo()) {
      const linkElement = this.linkTo.renderHTML(documentFactory);
      scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
      translateElementBy(
        linkElement,
        (this.getMbr().getWidth() - parseInt(linkElement.style.width)) / scaleX,
        0
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
    return this.linkTo.link;
  }

  download() {
    const linkElem = document.createElement("a");

    linkElem.href = this.signedUrl;
    linkElem.setAttribute("download", "");
    linkElem.click();
  }

  onRemove() {
    const storageId = this.getStorageId();
    if (storageId) {
      conf.hooks.beforeMediaRemove([storageId], this.board.getBoardId());
    }
    super.onRemove();
  }
}
