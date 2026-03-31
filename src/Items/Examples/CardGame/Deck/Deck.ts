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
import {transformOps} from "Items/Transformation/transformOps";
import {DeckOperation} from "Items/Examples/CardGame/Deck/DeckOperation";
import {conf} from "../../../../Settings";
import {Path} from "../../../Path";
import {registerHotkey} from "../../../../Keyboard/HotkeyRegistry";

export const defaultDeckData: BaseItemData = {
  itemType: "Deck",
};

export class Deck extends BaseItem<Deck> {
  readonly subject = new Subject<Deck>();
  shouldUseCustomRender = false;
  private cachedCanvas: HTMLCanvasElement | null = null;
  private isCacheDirty = true;
  resizeEnabled = false;
  path: Path | null = null
  private isPerpendicular: boolean | undefined = undefined;
  private animationFrameId?: number;
  drawingContext: DrawingContext | null = null;

  constructor(
    board: Board,
    id = "",
  ) {
    super(board, id, defaultDeckData, true);

    this.index!.listUnderPoint = () => []
    this.index!.listEnclosedBy = () => []
    this.index!.listEnclosedOrCrossedBy = () => []

    this.updateMbr();
  }

  getIsPerpendicular(): boolean | undefined {
    return this.isPerpendicular;
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
        const firstCard = this.getFirstCard();
        const firstCardDimensions = firstCard?.getDimensions();
        const canAddItem = !this.index?.getById(childId)
          && foundItem instanceof Card
          && (typeof this.isPerpendicular === "undefined" || this.isPerpendicular === foundItem.getIsRotatedPerpendicular())
          && (!firstCardDimensions || (firstCardDimensions.width === foundItem.getDimensions().width && firstCardDimensions.height === foundItem.getDimensions().height))
        if (canAddItem) {
          this.isPerpendicular = foundItem.getIsRotatedPerpendicular()
          foundItem.apply(transformOps.setLocal(foundItem.id, {
            translateX: this.left + (this.index?.listAll().length || 0) * (this.isPerpendicular ? 0 : conf.DECK_HORIZONTAL_OFFSET),
            translateY: this.top + (this.index?.listAll().length || 0) * (this.isPerpendicular ? conf.DECK_VERTICAL_OFFSET : 0)
          }));
          if (firstCard) {
            const {scaleX, scaleY} = foundItem.transformation.getMatrixData();
            const {scaleX: targetScaleX, scaleY: targetScaleY} = firstCard.transformation.getMatrixData();
            if (scaleX !== targetScaleX || scaleY !== targetScaleY) {
              foundItem.apply(transformOps.setLocal(foundItem.id, { scaleX: targetScaleX, scaleY: targetScaleY }));
            }
          }
          this.board.selection.remove(foundItem);
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
    return (this.index?.listAll() || []) as Card[];
  }

  getTopCard(): Card | undefined {
    const cards = this.index?.listAll() || [];
    const card = cards[cards.length - 1] as Card | undefined;
    if (card) {
      this.removeChildItems(card);
      return card;
    }
  }

  getCards(count: number): Card[] | undefined {
    const cards = (this.index?.listAll() || []).reverse().slice(0, count) as Card[];
    if (cards.length > 0) {
      this.removeChildItems(cards);
      return cards;
    }
  }

  getBottomCard(): Card | undefined {
    const card = this.index?.listAll()[0] as Card | undefined;
    if (card) {
      this.removeChildItems(card);
      return card;
    }
  }

  getRandomCard(): Card | undefined {
    const cards = this.index?.listAll() || [];
    const card = cards[Math.floor(Math.random() * cards.length)] as Card | undefined;
    if (card) {
      this.removeChildItems(card);
      return card;
    }
  }

  shuffleDeck(): void {
    if (!this.index) {
      return;
    }
    const shuffled = [...this.index.listAll()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.emitAnimation();
    this.removeChildItems(this.index.listAll());
    this.addChildItems(shuffled);
  }

  flipDeck(): void {
    if (!this.index || !this.index.listAll().length) {
      return;
    }
    const cards = this.index.listAll() as Card[];
    cards[0].toggleIsOpen(cards);
    const reversed = [...cards].reverse();
    this.removeChildItems(cards);
    this.addChildItems(reversed);
  }

  apply(op: any): void {
    super.apply(op);
    if (op.class === "Transformation") {
      this.updateMbr();
    } else if (op.class === "Deck") {
      if (
        op.method === "startAnimation" &&
        op.newData.timeStamp &&
        Date.now() - op.newData.timeStamp < 4000
      ) {
        this.startAnimation();
        setTimeout(() => {
          this.stopAnimation();
        }, 2000);
      }
      this.isCacheDirty = true;
    }
    this.subject.publish(this);
  }

  updateMbr(): void {
    const {translateX, translateY} =
      this.transformation.getMatrixData();
    const items = this.index!.listAll();
    const itemsMbr = items[0]?.getMbr().combine(items.slice(1).map(item => item.getMbr()));
    this.left = translateX;
    this.top = translateY;
    this.right = translateX + (itemsMbr?.getWidth() || conf.CARD_DIMENSIONS.width + (this.isPerpendicular ? 0 : conf.DECK_HORIZONTAL_OFFSET * ((this.childIds.length || 1) - 1)));
    this.bottom = translateY + (itemsMbr?.getHeight() || conf.CARD_DIMENSIONS.height + (this.isPerpendicular ? conf.DECK_VERTICAL_OFFSET * ((this.childIds.length || 1) - 1) : 0));
    this.path = new Path(this.getMbr().getLines(), true, "#FFFFFF");
  }

  deserialize(data: SerializedItemData): this {
    super.deserialize(data);
    if (data.childIds) {
      this.childIds = data.childIds;
    }
    this.updateMbr();
    this.subject.publish(this);
    return this;
  }

  render(context: DrawingContext): void {
    this.drawingContext = context;
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
      if (this.animationFrameId) {
        const now = Date.now();
        const progress = (now % 2000) / 2000;
        const yPos = this.top + (this.getHeight() * Math.abs(Math.sin(progress * Math.PI)));

        ctx.fillStyle = conf.SELECTION_COLOR;
        ctx.fillRect(
          this.left,
          yPos - 2,
          this.getWidth(),
          4
        );
      }
      ctx.restore();
    }
  }

  emitAnimation() {
    this.emit({
      class: "Deck",
      method: "startAnimation",
      item: [this.getId()],
      newData: {timeStamp: Date.now()},
    });
  }

  startAnimation() {
    if (!this.animationFrameId) {
      const animate = () => {
        if (this.drawingContext) {
          this.subject.publish(this);
          this.animationFrameId = requestAnimationFrame(animate);
        }
      };
      this.animationFrameId = requestAnimationFrame(animate);
    }
  }

  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
      this.drawingContext = null;
    }
  }


  private updateCache(context: DrawingContext) {
    const cards = this.index?.listAll() as Card[];
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

    const tempContext = new DrawingContext(context.camera, tempCtx, context.cursorCtx, context.matrix);

    cards.forEach((_, index) => {
      topCard.render(tempContext, this.isPerpendicular ? 0 : index * conf.DECK_HORIZONTAL_OFFSET, this.isPerpendicular ? index * conf.DECK_VERTICAL_OFFSET : 0);
    });

    this.cachedCanvas = tempCanvas;
    this.isCacheDirty = false;
    this.updateMbr();
  }

  getFirstCard() {
    return this.index?.listAll()[0] as Card | undefined;
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
      card.apply(transformOps.translateTo(card, left, top - 280));
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
      card.apply(transformOps.translateTo(card, left, top - 280));
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
      card.apply(transformOps.translateTo(card, left, top - 280));
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

    const cardsOrDecks = board.selection.items.listAll();
    const onlyCards = board.selection.items.isAllItemsType("Card");
    if (onlyCards) {
      const deck = new Deck(board, "");
      deck.apply(transformOps.setLocal(deck.id, { translateX: cardsOrDecks[cardsOrDecks.length - 1].left, translateY: cardsOrDecks[cardsOrDecks.length - 1].top }));
      const addedDeck = board.add(deck);
      board.selection.removeAll();
      addedDeck.addChildItems(cardsOrDecks);
      board.selection.add(addedDeck);
    } else {
      let mainDeck: Deck | null = null;
      const cards: Card[] = [];
      cardsOrDecks.forEach((item) => {
        if (item.itemType === "Card") {
          cards.push(item as Card);
        } else if (item.itemType === "Deck") {
          const deck = item as Deck;
          if (mainDeck) {
            cards.push(...deck.getDeck());
            board.remove(deck);
          } else {
            mainDeck = deck;
          }
        }
      });
      board.selection.removeAll();
      if (mainDeck) {
        (mainDeck as Deck).addChildItems(cards);
        board.selection.add(mainDeck);
      }
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
