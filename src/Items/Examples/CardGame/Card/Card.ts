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
import {registerHotkey} from "../../../../Keyboard/HotkeyRegistry";
import {scaleElementBy, translateElementBy} from "HTMLRender/";

export const defaultCardData: BaseItemData = {
  itemType: "Card",
  isOpen: false,
  faceUrl: "",
  backsideUrl: "",
};

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
  enableResize = false;

  constructor(
    board: Board,
    id = "",
    urls?: { faceUrl: string, backsideUrl: string },
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
      if (this.parent === "Board" && op.method === "translateBy") {
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
    this.face.crossOrigin = "anonymous";
    this.backside.crossOrigin = "anonymous";
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

  getImage(): HTMLImageElement | null {
    return this.imageToRender;
  }

  render(context: DrawingContext, left?: number, top?: number): void {
    if (this.transformationRenderBlock) {
      return;
    }

    const ctx = context.ctx;
    if (this.imageToRender && this.imageToRender.complete) {
      ctx.save();

      ctx.drawImage(
        this.imageToRender,
        typeof left === "number" ? left : this.left,
        typeof top === "number" ? top : this.top,
        conf.CARD_DIMENSIONS.width,
        conf.CARD_DIMENSIONS.height,
      );

      ctx.restore();
    }
  }

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = super.renderHTML(documentFactory);
    const { translateX, translateY, scaleX, scaleY } =
      this.transformation.matrix;
    const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;


    div.style.backgroundImage = `url(${this.imageToRender?.src || this.backsideUrl})`;

    div.id = this.getId();
    div.style.width = `${conf.CARD_DIMENSIONS.width}px`;
    div.style.height = `${conf.CARD_DIMENSIONS.height}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.style.backgroundSize = "cover";

    return div;
  }

  updateMbr(): void {
    const {translateX, translateY, scaleX, scaleY} =
      this.transformation.matrix;
    this.left = translateX;
    this.top = translateY;
    this.right = this.left + conf.CARD_DIMENSIONS.width * scaleX;
    this.bottom = this.top + conf.CARD_DIMENSIONS.height * scaleY;
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

// registerHotkey({
//   name: "flipCard",
//   hotkey: {key: {button: "KeyF", shift: true}, label: {windows: "F", mac: "F"}},
//   boardMode: "edit",
//   hotkeyConfig: {
//     allItemsType: ["Card"],
//     cb: (event?: KeyboardEvent, board?: Board) => {
//       const cards = board?.selection.items.list() as Card[] | undefined;
//       if (!cards) {
//         return;
//       }
//       cards[0].toggleIsOpen(cards);
//     }
//   }
// })
