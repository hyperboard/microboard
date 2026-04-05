import {
  BaseItem,
  BaseItemData,
  SerializedItemData,
} from "Items/BaseItem/BaseItem";
import { UpdateHint } from "Items/BaseItem/UpdateHint";
import {Board} from "Board";
import {Subject} from "Subject";
import {registerItem} from "Items/RegisterItem";
import {Card} from "Items/Card/Card";
import {DrawingContext} from "Geometry/DrawingContext";
import {transformOps} from "Geometry/Transformation/transformOps";
import {DeckOperation} from "Items/Deck/DeckOperation";
import {conf} from "Settings";
import {Path} from "Geometry/Path";
import {Mbr} from "Geometry/Mbr";
import { registerHotkey } from "Keyboard/HotkeyRegistry";
import { SimpleSpatialIndex } from "SpatialIndex/SimpleSpatialIndex";
import { registerSelectionAction } from "Overlay";
import { createDeckSelectionAction, deckOverlay } from "./DeckOverlay";

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
    super(board, id);
    this.index = new SimpleSpatialIndex(this.board.camera, this.board.pointer);

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
            translateX: this.mbr.left + (this.index?.listAll().length || 0) * (this.isPerpendicular ? 0 : conf.DECK_HORIZONTAL_OFFSET),
            translateY: this.mbr.top + (this.index?.listAll().length || 0) * (this.isPerpendicular ? conf.DECK_VERTICAL_OFFSET : 0)
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

  apply(opIn: any): void {
    const op = opIn as any;
    super.apply(op);
    if (op.class === "Deck") {
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
    }

    const hint = this.calculateUpdateHint(op);
    this.updateVisuals(op, hint);
  }

  protected override updateVisuals(_op: any, hint: UpdateHint): void {
    if (hint === UpdateHint.VisualOnly) {
      this.isCacheDirty = true;
      this.subject.publish(this);
      return;
    }

    this.isCacheDirty = true;
    this.updateMbr();
    this.subject.publish(this);
  }

  protected override getPropertyUpdateHint(property: string): UpdateHint {
    if (property === "childIds") {
      return UpdateHint.LayoutAffecting;
    }
    return super.getPropertyUpdateHint(property);
  }

  updateMbr(): void {
    const children = this.index!.listAll();
    if (children.length === 0) {
      const { translateX, translateY } = this.transformation.getMatrixData();
      this.mbr.left = translateX;
      this.mbr.top = translateY;
      this.mbr.right = translateX + conf.CARD_DIMENSIONS.width + (this.isPerpendicular ? 0 : conf.DECK_HORIZONTAL_OFFSET);
      this.mbr.bottom = translateY + conf.CARD_DIMENSIONS.height + (this.isPerpendicular ? conf.DECK_VERTICAL_OFFSET : 0);
    } else {
      const worldUnion = Mbr.unionOf(children.map(c => (c as BaseItem).getWorldMbr()));
      const parentMatrix = this.getParentWorldMatrix();
      const parentSpaceMbr = worldUnion.getTransformed(parentMatrix.getInverse());

      this.mbr.left = parentSpaceMbr.left;
      this.mbr.top = parentSpaceMbr.top;
      this.mbr.right = parentSpaceMbr.right;
      this.mbr.bottom = parentSpaceMbr.bottom;
    }
    this.path = new Path(this.getMbr().getLines(), true, "#FFFFFF");
  }

  deserialize(data: SerializedItemData): this {
    super.deserialize(data);
    if (data.childIds) {
      this.childIds = data.childIds;
    }
    this.updateVisuals({ method: "deserialize", class: this.itemType } as any, UpdateHint.FullRebuild);
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
      ctx.drawImage(this.cachedCanvas, this.mbr.left, this.mbr.top);
      if (this.animationFrameId) {
        const now = Date.now();
        const progress = (now % 2000) / 2000;
        const yPos = this.mbr.top + (this.getHeight() * Math.abs(Math.sin(progress * Math.PI)));

        ctx.fillStyle = conf.SELECTION_COLOR;
        ctx.fillRect(
          this.mbr.left,
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
  overlay: deckOverlay,
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

function createDeck(event?: KeyboardEvent, board?: Board): void {
  board?.selection.createDeck();
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

registerSelectionAction(createDeckSelectionAction);
