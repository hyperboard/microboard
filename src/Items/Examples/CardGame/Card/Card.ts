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
import {Mbr} from "Items/Mbr/Mbr";
import {throttle} from "../../../../utils";

export type DeckRenderData = {
  left: number;
  top: number;
  cardPosition: number;
};

export const defaultCardData: BaseItemData = {
  itemType: "Card",
  isOpen: false,
  name: "",
  isInDeck: false,
};

export const CARD_DIMENSIONS = {width: 250, height: 400};

export class Card extends BaseItem {
  readonly subject = new Subject<Card>();
  private name = "";
  private isOpen = false;
  private isInDeck = false;
  private throttledBringToFront: () => void;
  image: HTMLImageElement | null = null;
  backside: HTMLImageElement | null = null;
  private imageToRender: HTMLImageElement | null = null;
  shouldUseCustomRender = false;

  constructor(
    board: Board,
    id = "",
    defaultData: BaseItemData | undefined,
    name: string,
  ) {
    super(board, id, defaultCardData);
    this.name = name;

    this.createImages();

    this.throttledBringToFront = throttle(() => {
      this.board.bringToFront(this);
    }, 1000);

    this.transformation.subject.subscribe(() => {
      this.throttledBringToFront();
      this.updateMbr();
      this.updateImageToRender();
      this.subject.publish(this);
    });

    this.updateMbr();
  }

  createImages() {
    this.image = conf.documentFactory.createElement(
      "img",
    ) as HTMLImageElement;
    this.backside = conf.documentFactory.createElement(
      "img",
    ) as HTMLImageElement;
    this.image.src = `/Assets/Cards/${this.name}.png`;
    this.backside.src = `/Assets/Cards/backside.png`;
    this.image.onload = () => {
      this.subject.publish(this);
    };
    this.backside.onload = () => {
      this.subject.publish(this);
    };
  }

  setIsInDeck(isInDeck: boolean) {
    this.emit({
      class: "Card",
      method: "setIsInDeck",
      item: [this.getId()],
      newData: {isInDeck},
      prevData: {isInDeck: this.isInDeck},
    });
  }

  updateImageToRender() {
    this.imageToRender = this.backside;
    // if (this.parent !== "Board") {
    // 	const frame = this.board.items.getById(this.parent) as
    // 		| Frame
    // 		| undefined;
    // 	if (
    // 		frame &&
    // 		frame.getName() !== localStorage.getItem("currentUser")
    // 	) {
    // 		return;
    // 	}
    // }
    if (this.isOpen) {
      this.imageToRender = this.image;
    }
  }

  render(context: DrawingContext, deckRenderData?: DeckRenderData): void {
    if (
      this.transformationRenderBlock ||
      (this.isInDeck && !deckRenderData)
    ) {
      return;
    }

    const ctx = context.ctx;
    if (this.imageToRender && this.imageToRender.complete) {
      ctx.save();

      let left = this.left;
      let top = this.top;
      if (deckRenderData) {
        left = deckRenderData.left + 2 * deckRenderData.cardPosition;
        top = deckRenderData.top;
      }

      ctx.drawImage(
        this.imageToRender,
        left,
        top,
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

  getMbr(): Mbr {
    if (this.isInDeck) {
      return new Mbr(10_000, 10_000, 10_000, 10_000);
    }
    return super.getMbr();
  }

  getPath(): Path | Paths {
    return new Path(this.getMbr().getLines());
  }

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = documentFactory.createElement("card-item");
    return div;
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
          case "setIsInDeck":
            this.isInDeck = op.newData.isInDeck;
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
  // toolData: { tool: AddHand, name: "AddHand" },
});
