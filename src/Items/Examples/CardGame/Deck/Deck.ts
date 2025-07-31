import {
  BaseItem,
  BaseItemData,
  SerializedItemData,
} from "Items/BaseItem/BaseItem";
import {Board} from "Board";
import {Subject} from "Subject";
import {registerItem} from "Items/RegisterItem";
import {Card} from "Items/Examples/CardGame/Card/Card";
import {DrawingContext} from "Items/DrawingContext";
import {DeckOperation} from "Items/Examples/CardGame/Deck/DeckOperation";
import {conf} from "../../../../Settings";
import {Path} from "../../../Path";
import {registerHotkey} from "../../../../Keyboard/HotkeyRegistry";
import {DocumentFactory} from "api/DocumentFactory";

export const defaultDeckData: BaseItemData = {
  itemType: "Deck",
};

export class Deck extends BaseItem {
  readonly subject = new Subject<Deck>();
  shouldUseCustomRender = false;
  private cachedCanvas: HTMLCanvasElement | null = null;
  private isCacheDirty = true;
  enableResize = false;
  path: Path | null = null

  constructor(
    board: Board,
    id = "",
  ) {
    super(board, id, defaultDeckData, true);

    this.index!.getUnderPoint = () => []
    this.index!.getEnclosed = () => []
    this.index!.getEnclosedOrCrossed = () => []

    this.transformation.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });
    this.updateMbr();
  }

  applyAddChildren(childIds: string[]): void {
    if (!this.index) {
      return;
    }
    childIds.forEach((childId) => {
      const foundItem = this.board.items.getById(childId);
      if (
        this.parent !== childId &&
        this.getId() !== childId
      ) {
        if (!this.index?.getById(childId) && foundItem?.itemType === "Card") {
          foundItem.transformation.apply({
            class: 'Transformation',
            method: 'translateTo',
            item: [this.id],
            x: this.left + (this.index?.list().length || 0) * conf.DECK_HORIZONTAL_OFFSET,
            y: this.top - (this.index?.list().length || 0) * conf.DECK_VERTICAL_OFFSET,
          })
          this.board.items.index.remove(foundItem);
          foundItem.parent = this.getId();
          foundItem.shouldUseRelativeAlignment = false;
          this.index?.insert(foundItem);
        }
      }
    });
    this.updateChildrenIds();
    this.updateMbr();
    this.subject.publish(this);
  }

  applyRemoveChildren(childIds: string[]) {
    if (!this.index) {
      return;
    }
    childIds.forEach((childId) => {
      const foundItem = this.index?.getById(childId);
      if (
        this.parent !== childId &&
        this.getId() !== childId
      ) {
        if (foundItem) {
          this.index?.remove(foundItem);
          foundItem.parent = "Board";
          foundItem.shouldUseRelativeAlignment = true;
          this.board.items.index.insert(foundItem);
        }
      }
    });
    this.updateChildrenIds();
    this.updateMbr();
    this.subject.publish(this);
  }

  getDeck(): Card[] {
    return (this.index?.list() || []) as Card[];
  }

  getTopCard(): Card | undefined {
    const card = this.index?.list()[this.index?.list().length - 1] as Card | undefined;
    if (card) {
      this.removeChildItems(card);
      return card;
    }
  }

  getBottomCard(): Card | undefined {
    const card = this.index?.list()[0] as Card | undefined;
    if (card) {
      this.removeChildItems(card);
      return card;
    }
  }

  getRandomCard(): Card | undefined {
    const card = this.index?.list()[Math.floor(Math.random() * this.index?.list().length)] as Card | undefined;
    if (card) {
      this.removeChildItems(card);
      return card;
    }
  }

  shuffleDeck(): void {
    if (!this.index) {
      return;
    }
    const shuffled = [...this.index.list()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.removeChildItems(this.index.list());
    this.addChildItems(shuffled);
  }

  flipDeck(): void {
    if (!this.index || !this.index.list().length) {
      return;
    }
    const cards = this.index.list() as Card[];
    cards[0].toggleIsOpen(cards);
    const reversed = [...cards].reverse();
    this.removeChildItems(cards);
    this.addChildItems(reversed);
  }

  apply(op: DeckOperation): void {
    super.apply(op);
    if (op.class === "Deck") {
      this.isCacheDirty = true;
    }
    this.subject.publish(this);
  }

  updateMbr(): void {
    const {translateX, translateY} =
      this.transformation.matrix;
    const items = this.index!.list();
    const itemsMbr = items[0]?.getMbr().combine(items.slice(1).map(item => item.getMbr()));
    this.left = translateX;
    this.top = translateY;
    this.right = translateX + (itemsMbr?.getWidth() || conf.CARD_DIMENSIONS.width + conf.DECK_HORIZONTAL_OFFSET * ((this.children.length || 1) - 1));
    this.bottom = translateY + (itemsMbr?.getHeight() || conf.CARD_DIMENSIONS.height - conf.DECK_VERTICAL_OFFSET * ((this.children.length || 1) - 1));
    this.path = new Path(this.getMbr().getLines(), true, "#FFFFFF");
  }

  deserialize(data: SerializedItemData): this {
    super.deserialize(data);
    if (data.children) {
      this.children = data.children;
    }
    this.updateMbr();
    this.subject.publish(this);
    return this;
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }

    const ctx = context.ctx;

    if (this.isCacheDirty || !this.cachedCanvas) {
      this.updateCache(context);
      this.path?.render(context);
    }

    if (this.cachedCanvas && this.cachedCanvas.width && this.cachedCanvas.height) {
      ctx.save();
      ctx.drawImage(this.cachedCanvas, this.left, this.top);
      ctx.restore();
    }
  }

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = super.renderHTML(documentFactory);
    const cards = this.index?.list() as Card[];
    const topCard = cards[cards.length - 1];
    if (!topCard) {
      return div;
    }
    const { translateX, translateY, scaleX, scaleY } =
      this.transformation.matrix;
    const transform = `translate(${translateX}px, ${translateY}px) scale(1, 1)`;

    const topCardElement = topCard.renderHTML(documentFactory);
    div.appendChild(topCardElement);
    const offset = ((this.index?.list().length || 0) - 1) * 2;
    topCardElement.style.transform = `translate(${offset}px, ${0}px) scale(1, 1)`

    div.id = this.getId();
    div.style.width = `${this.getWidth()}px`;
    div.style.height = `${this.getHeight()}px`;
    div.style.boxShadow = `${offset}px 0px 0px 0px rgba(34, 60, 80, 0.74) inset`
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.style.backgroundSize = "cover";

    return div;
  }

  private updateCache(context: DrawingContext) {
    const cards = this.index?.list() as Card[];
    const topCard = cards[cards.length - 1];
    const topCardImage = topCard?.getImage();
    const width = this.getWidth();
    const height = this.getHeight();
    if (!width || !height || !topCardImage || !topCardImage.complete) {
      return;
    }
    const tempCanvas = conf.documentFactory.createElement('canvas') as HTMLCanvasElement;
    tempCanvas.width = width;
    tempCanvas.height = height;

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const tempContext = {...context, ctx: tempCtx};

    cards.forEach((_, index) => {
      topCard.render(tempContext, index * conf.DECK_HORIZONTAL_OFFSET, index * conf.DECK_VERTICAL_OFFSET);
    });

    this.cachedCanvas = tempCanvas;
    this.isCacheDirty = false;
    this.updateMbr();
  }
}

registerItem({
  item: Deck,
  defaultData: defaultDeckData,
});

registerHotkey({
  name: "getCard-top",
  hotkey: {key: {button: "KeyT", shift: true}, label: {windows: "Shift+T", mac: "⇧T"}},
  boardMode: "edit",
  hotkeyConfig: {
    allItemsType: ["Deck"],
    cb: (event?: KeyboardEvent, board?: Board) => {
      const deck = board?.selection.items.getSingle();
      if (!(deck instanceof Deck)) {
        return;
      }
      const card = deck.getTopCard();
      const { left, top } = deck.getMbr();
      if (!card) {
        return;
      }
      card.transformation.translateTo(left, top - 280);
      if (deck.getDeck().length === 0) {
        board?.remove(deck);
      }
    },
  }
})

registerHotkey({
  name: "getCard-bottom",
  hotkey: {key: {button: "KeyB", shift: true}, label: {windows: "Shift+B", mac: "⇧B"}},
  boardMode: "edit",
  hotkeyConfig: {
    allItemsType: ["Deck"],
    cb: (event?: KeyboardEvent, board?: Board) => {
      const deck = board?.selection.items.getSingle();
      if (!(deck instanceof Deck)) {
        return;
      }
      const card = deck.getBottomCard();
      const { left, top } = deck.getMbr();
      if (!card) {
        return;
      }
      card.transformation.translateTo(left, top - 280);
      if (deck.getDeck().length === 0) {
        board?.remove(deck);
      }
    },
  }
})

registerHotkey({
  name: "getCard-random",
  hotkey: {key: {button: "KeyR", shift: true}, label: {windows: "Shift+R", mac: "⇧R"}},
  boardMode: "edit",
  hotkeyConfig: {
    allItemsType: ["Deck"],
    cb: (event?: KeyboardEvent, board?: Board) => {
      const deck = board?.selection.items.getSingle();
      if (!(deck instanceof Deck)) {
        return;
      }
      const card = deck.getRandomCard();
      const { left, top } = deck.getMbr();
      if (!card) {
        return;
      }
      card.transformation.translateTo(left, top - 280);
      if (deck.getDeck().length === 0) {
        board?.remove(deck);
      }
    },
  }
})

registerHotkey({
  name: "flipDeckOrCard",
  hotkey: {key: {button: "KeyF", shift: true}, label: {windows: "Shift+F", mac: "⇧F"}},
  boardMode: "edit",
  hotkeyConfig: {
    allItemsType: ["Deck", "Card"],
    cb: (event?: KeyboardEvent, board?: Board) => {
      const cardsOrDecks = board?.selection.items.list();
      if (!cardsOrDecks) {
        return;
      }
      let cards: Card[] = [];
      let decks: Deck[] = [];
      for (const item of cardsOrDecks) {
        if (item instanceof Card) {
          cards.push(item);
        } else if (item instanceof Deck) {
          decks.push(item);
        }
      }
      cards[0]?.toggleIsOpen(cards);
      decks.forEach(deck => {
        deck.flipDeck();
      })
    }
  }
})

export function createDeck(event?: KeyboardEvent, board?: Board): void {
  if (!board) {
    return;
  }
  const single = board.selection.items.getSingle();
  if (single && single.itemType === "Deck") {
    return;
  }

  const cardsOrDecks = board.selection.items.list();
  const onlyCards = board.selection.items.isAllItemsType("Card");
  if (onlyCards) {
    const deck = new Deck(board, "");
    deck.transformation.apply({
      class: "Transformation",
      method: "translateTo",
      item: [deck.getId()],
      x: cardsOrDecks[cardsOrDecks.length - 1].left,
      y: cardsOrDecks[cardsOrDecks.length - 1].top,
    });
    const addedDeck = board.add(deck);
    board.selection.items.removeAll();
    addedDeck.addChildItems(cardsOrDecks);
    board.selection.items.add(addedDeck);
  } else {
    let mainDeck: Deck | null = null;
    const cards: Card[] = [];
    cardsOrDecks.forEach((item) => {
      if (item.itemType === "Card") {
        cards.push(item);
      } else if (item.itemType === "Deck") {
        if (mainDeck) {
          cards.push(...mainDeck.getDeck());
          board.remove(mainDeck);
          mainDeck = item;
        } else {
          mainDeck = item;
        }
      }
    });
    board.selection.items.removeAll();
    mainDeck.addChildItems(cards);
    board.selection.items.add(mainDeck);
  }
};

registerHotkey({
  name: "createDeck",
  hotkey: {key: {button: "KeyD", shift: true}, label: {windows: "Shift+D", mac: "⇧D"}},
  boardMode: "edit",
  hotkeyConfig: {
    allItemsType: ["Deck", "Card"],
    cb: createDeck,
  }
})
