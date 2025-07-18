import {
  BaseItem,
  BaseItemData,
  SerializedItemData,
} from "Items/BaseItem/BaseItem";
import {Board} from "Board";
import {DrawingContext} from "Items/DrawingContext";
import {DocumentFactory} from "api/DocumentFactory";
import {Path} from "Items/Path/Path";
import {Subject} from "Subject";
import {Paths} from "Items/Path/Paths";
import {registerItem} from "Items/RegisterItem";
import {CardOperation} from "Items/Examples/CardGame/Card/CardOperation";
import {conf} from "Settings";
import {throttle} from "../../../../utils";

export const defaultCardData: BaseItemData = {
  itemType: "Card",
  isOpen: false,
  faceUrl: "",
  backsideUrl: "",
};

export const CARD_DIMENSIONS = {width: 250, height: 400};

export class Card extends BaseItem {
  readonly subject = new Subject<Card>();
  private faceUrl = "";
  private backsideUrl = "";
  private isOpen = false;
  private throttledBringToFront: () => void;
  face: HTMLImageElement | null = null;
  backside: HTMLImageElement | null = null;
  private imageToRender: HTMLImageElement | null = null;
  shouldUseCustomRender = false;

  constructor(
    board: Board,
    id = "",
    urls?: {faceUrl: string, backsideUrl: string},
  ) {
    super(board, id, defaultCardData);

    if (urls) {
      this.faceUrl = urls.faceUrl;
      this.backsideUrl = urls.backsideUrl;

      this.createImages();
    }

    this.throttledBringToFront = throttle(() => {
      this.board.bringToFront(this);
    }, 1000);

    this.transformation.subject.subscribe((_, op) => {
      if (this.parent === "Board" && op.method === "translateBy" || (op.method === "transformMany" && !Object.keys(op.items).length)) {
        this.throttledBringToFront();
      }
      this.updateMbr();
      this.subject.publish(this);
    });

    this.updateMbr();
  }

  createImages() {
    this.face = conf.documentFactory.createElement(
      "img",
    ) as HTMLImageElement;
    this.backside = conf.documentFactory.createElement(
      "img",
    ) as HTMLImageElement;
    this.face.src = this.faceUrl;
    this.backside.src = this.backsideUrl;
    this.face.onload = () => {
      this.subject.publish(this);
    };
    this.backside.onload = () => {
      this.subject.publish(this);
    };
    this.updateImageToRender();
  }

  updateImageToRender() {
    this.imageToRender = this.backside;
    if (this.isOpen) {
      this.imageToRender = this.face;
    }
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }

    const ctx = context.ctx;
    if (this.imageToRender && this.imageToRender.complete) {
      ctx.save();

      ctx.drawImage(
        this.imageToRender,
        this.left,
        this.top,
        CARD_DIMENSIONS.width,
        CARD_DIMENSIONS.height,
      );

      ctx.restore();
    }
  }

  updateMbr(): void {
    const {translateX, translateY, scaleX, scaleY} =
      this.transformation.matrix;
    this.left = translateX;
    this.top = translateY;
    this.right = this.left + CARD_DIMENSIONS.width * scaleX;
    this.bottom = this.top + CARD_DIMENSIONS.height * scaleY;
  }

  getPath(): Path | Paths {
    return new Path(this.getMbr().getLines());
  }

  deserialize(data: SerializedItemData): this {
    super.deserialize(data);

    this.updateMbr();
    this.createImages();
    this.subject.publish(this);
    return this;
  }

  toggleIsOpen(): void {
    this.emit({
      class: "Card",
      method: "setIsOpen",
      item: [this.getId()],
      newData: {isOpen: !this.isOpen},
      prevData: {isOpen: this.isOpen},
    });
  }

  apply(op: CardOperation): void {
    super.apply(op);
    switch (op.class) {
      case "Card":
        switch (op.method) {
          case "setIsOpen":
            this.isOpen = op.newData.isOpen;
            this.updateImageToRender();
            break;
        }
        break;
    }
    this.subject.publish(this);
  }
}

registerItem({
  item: Card,
  defaultData: defaultCardData,
});
