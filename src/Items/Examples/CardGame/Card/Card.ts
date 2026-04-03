import {
  BaseItem,
  BaseItemData,
  SerializedItemData,
} from "Items/BaseItem/BaseItem";
import {Board} from "Board";
import {DrawingContext} from "Geometry/DrawingContext";
import {Path} from "Geometry/Path/Path";
import {Subject} from "Subject";
import {Paths} from "Geometry/Path/Paths";
import {registerItem} from "Items/RegisterItem";
import {CardOperation} from "Items/Examples/CardGame/Card/CardOperation";
import {conf} from "Settings";
import {throttle} from "../../../../utils";
import {registerHotkey} from "Keyboard/HotkeyRegistry";
import {getMediaSignedUrl} from "api/MediaHelpers";


export interface CardData extends BaseItemData {
  isOpen?: boolean;
  faceUrl?: string;
  backsideUrl?: string;
  dimensions?: {width: number; height: number};
}

export const defaultCardData: CardData = {
  itemType: "Card",
  isOpen: false,
  faceUrl: "",
  backsideUrl: "",
  dimensions: {width: conf.CARD_DIMENSIONS.width, height: conf.CARD_DIMENSIONS.height},
};

export class Card extends BaseItem<Card> {
  readonly subject = new Subject<Card>();
  private faceUrl = "";
  private backsideUrl = "";
  private isOpen = false;
  private throttledBringToFront: () => void;
  face: HTMLImageElement | null = null;
  backside: HTMLImageElement | null = null;
  private imageToRender: HTMLImageElement | null = null;
  shouldUseCustomRender = false;
  onlyProportionalResize = true;
  dimensions = {width: conf.CARD_DIMENSIONS.width, height: conf.CARD_DIMENSIONS.height};

  constructor(
    board: Board,
    id = "",
  ) {
    super(board, id);

    this.dimensions = defaultCardData.dimensions || this.dimensions;

    if (defaultCardData.faceUrl && defaultCardData.backsideUrl) {
      this.faceUrl = defaultCardData.faceUrl;
      this.backsideUrl = defaultCardData.backsideUrl;

      this.createImages();
    }

    this.throttledBringToFront = throttle(() => {
      this.board.bringToFront(this);
    }, 1000);

    this.updateMbr();

    this.updateMbr();
  }

  getDimensions() {
    return this.dimensions;
  }

  async createImages() {
    this.face = conf.documentFactory.createElement(
      "img",
    ) as HTMLImageElement;
    this.backside = conf.documentFactory.createElement(
      "img",
    ) as HTMLImageElement;
    this.face.src = await getMediaSignedUrl(this.faceUrl) || "";
    this.backside.src = await getMediaSignedUrl(this.backsideUrl) || "";
    this.face.onload = () => {
      this.subject.publish(this);
    };
    this.backside.onload = () => {
      this.subject.publish(this);
    };
    this.updateImageToRender();
  }

  updateImageToRender() {
    if (this.isOpen) {
      this.imageToRender = this.face;
    } else {
      this.imageToRender = this.backside;
    }
  }

  getImage(): HTMLImageElement | null {
    return this.imageToRender;
  }

  getIsRotatedPerpendicular(): boolean {
    return Boolean(this.transformation.getRotation() % 180);
  }

  render(context: DrawingContext, left?: number, top?: number): void {
    if (this.transformationRenderBlock) {
      return;
    }

    const ctx = context.ctx;
    if (this.imageToRender && this.imageToRender.complete && this.imageToRender.naturalWidth > 0) {
      ctx.save();

      let {x: centerX, y: centerY} = this.getMbr().getCenter();
      const width = this.getWidth();
      const height = this.getHeight();

      if (typeof left === "number" && typeof top === "number") {
        centerX = left + width / 2;
        centerY = top + height / 2;
      }

      ctx.translate(centerX, centerY);
      ctx.rotate((this.transformation.getRotation() * Math.PI) / 180);
      if (this.dimensions.width < this.dimensions.height) {
        if (width > height) {
          ctx.drawImage(
            this.imageToRender,
            -height / 2,
            -width / 2,
            height,
            width
          );
        } else {
          ctx.drawImage(
            this.imageToRender,
            -width / 2,
            -height / 2,
            width,
            height
          );
        }
      } else {
        if (width > height) {
          ctx.drawImage(
            this.imageToRender,
            -width / 2,
            -height / 2,
            width,
            height
          );
        } else {
          ctx.drawImage(
            this.imageToRender,
            -height / 2,
            -width / 2,
            height,
            width
          );
        }
      }
      ctx.restore();
    }
  }


  updateMbr(): void {
    const {translateX, translateY, scaleX, scaleY} =
      this.transformation.getMatrixData();
    const rotation = this.transformation.getRotation();
    const height = this.dimensions.height * scaleY;
    const width = this.dimensions.width * scaleX;
    if (rotation % 180 === 0) {
      this.mbr.left = translateX;
      this.mbr.top = translateY;
      this.mbr.right = this.mbr.left + width;
      this.mbr.bottom = this.mbr.top + height;
    } else {
      const centerX = translateX + width / 2;
      const centerY = translateY + height / 2;
      this.mbr.left = centerX - height / 2;
      this.mbr.top = centerY - width / 2;
      this.mbr.right = this.mbr.left + height;
      this.mbr.bottom = this.mbr.top + width;
    }
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

  toggleIsOpen(cards: Card[]): void {
    const openedCardIds: string[] = [];
    const closedCardIds: string[] = [];
    for (const card of cards) {
      if (card.isOpen) {
        openedCardIds.push(card.getId());
      } else {
        closedCardIds.push(card.getId());
      }
    }
    if (openedCardIds.length) {
      this.emitForManyItems({
        class: "Card",
        method: "setIsOpen",
        item: openedCardIds,
        newData: {isOpen: false},
        prevData: {isOpen: true},
      });
    }
    if (closedCardIds.length) {
      this.emitForManyItems({
        class: "Card",
        method: "setIsOpen",
        item: closedCardIds,
        newData: {isOpen: true},
        prevData: {isOpen: false},
      });
    }
  }

  apply(op: any): void {
    if (op.class === "Transformation") {
      if (
        this.parent === "Board" &&
        op.method === "applyMatrix" &&
        op.items.find((i: any) => i.id === this.id)?.matrix.scaleX === 1 &&
        op.items.find((i: any) => i.id === this.id)?.matrix.scaleY === 1
      ) {
        this.throttledBringToFront();
      }
      super.apply(op);
      this.updateMbr();
    }
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

registerHotkey({
  name: "Rotate90deg",
  hotkey: {key: {button: "KeyQ", shift: true}, label: {windows: "Shift+Q", mac: "⇧Q"}},
  boardMode: "edit",
  hotkeyConfig: {
    allItemsType: ["Image", "Card"],
    cb: (event?: KeyboardEvent, board?: Board) => {
      const items = board?.selection.items.list() as BaseItem[];
      if (!items) {
        return;
      }
      items.forEach((item) => {
        item.rotate(-90);
      })
    }
  }
})

registerHotkey({
  name: "Rotate90deg-clockwise",
  hotkey: {key: {button: "KeyE", shift: true}, label: {windows: "Shift+E", mac: "⇧E"}},
  boardMode: "edit",
  hotkeyConfig: {
    allItemsType: ["Image", "Card"],
    cb: (event?: KeyboardEvent, board?: Board) => {
      const items = board?.selection.items.list() as BaseItem[];
      if (!items) {
        return;
      }
      items.forEach((item) => {
        item.rotate(90);
      })
    }
  }
})
