import {
	BaseItem,
	BaseItemData,
	SerializedItemData,
} from "Items/BaseItem/BaseItem";
import { Board } from "Board";
import { Subject } from "Subject";
import { registerItem } from "Items/RegisterItem";
import { Card, CARD_DIMENSIONS } from "Items/Examples/CardGame/Card/Card";
import { DrawingContext } from "Items/DrawingContext";
import { DeckOperation } from "Items/Examples/CardGame/Deck/DeckOperation";

export const defaultDeckData: BaseItemData = {
	itemType: "Deck",
	cardIds: [],
};

export class Deck extends BaseItem {
	readonly subject = new Subject<Deck>();
	shouldUseCustomRender = false;
	cardIds: string[] = [];
	cards: Card[] = [];

	constructor(
		board: Board,
		id = "",
		defaultData?: BaseItemData,
		cards?: Card[],
	) {
		super(board, id, defaultDeckData);

		if (cards) {
			this.cards = cards;
			cards.forEach(card => card.setIsInDeck(true));
			this.transformation.matrix =
				cards[cards.length - 1].transformation.matrix;

			this.cardIds = cards.map(card => card.getId());
		}

		this.transformation.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.updateMbr();
	}

	getDeck(): Card[] {
		return this.cards;
	}

	getTopCard(): Card | undefined {
		const cardId = this.cardIds[this.cardIds.length - 1];
		return this.getCards([cardId])[0];
	}

	getBottomCard(): Card | undefined {
		const cardId = this.cardIds[0];
		return this.getCards([cardId])[0];
	}

	getRandomCard(): Card | undefined {
		const cardId =
			this.cardIds[Math.ceil(Math.random() * this.cardIds.length) - 1];
		return this.getCards([cardId])[0];
	}

	private getCards(cardIds: string[]): Card[] {
		const cards = this.findCardsOnBoard(cardIds);
		this.removeCards(cards);
		return cards;
	}

	private findCardsOnBoard(cardIds: string[]): Card[] {
		return cardIds
			.map(cardId => {
				return this.board.items.getById(cardId);
			})
			.filter(card => !!card) as unknown as Card[];
	}

	updateCards(): Card[] {
		if (this.cardIds.length === this.cards.length) {
			return this.cards;
		}
		this.cards = this.findCardsOnBoard(this.cardIds);
		return this.cards;
	}

	shuffleDeck(): void {
		const shuffled = [...this.cardIds];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		const cards = this.findCardsOnBoard(shuffled);
		this.addCards(cards, true);
	}

	addCards(cards: Card[], shouldReplaceExistingCards = false): void {
		cards.forEach(card => {
			card.setIsInDeck(true);
		});
		this.board.bringToFront(cards);
		this.emit({
			class: "Deck",
			method: "addCards",
			item: [this.getId()],
			newData: {
				cardIds: cards.map(card => card.getId()),
				shouldReplaceExistingCards,
			},
			prevData: { cardIds: this.cardIds, shouldReplaceExistingCards },
		});
	}

	removeCards(cards: Card[]): void {
		cards.forEach(card => {
			card.setIsInDeck(false);
		});
		this.emit({
			class: "Deck",
			method: "removeCards",
			item: [this.getId()],
			newData: { cardIds: cards.map(card => card.getId()) },
			prevData: { cardIds: this.cardIds },
		});
	}

	apply(op: DeckOperation): void {
		super.apply(op);
		switch (op.class) {
			case "Deck":
				switch (op.method) {
					case "addCards":
						if (op.newData.shouldReplaceExistingCards) {
							this.cardIds = op.newData.cardIds;
							this.cards = this.findCardsOnBoard(this.cardIds);
						} else {
							this.cardIds = [
								...op.newData.cardIds,
								...this.cardIds,
							];
							this.updateCards();
							this.updateMbr();
						}
						break;
					case "removeCards":
						this.cardIds = this.cardIds.filter(card => {
							return !op.newData.cardIds.includes(card);
						});
						this.updateCards();
						this.updateMbr();
						break;
				}
				break;
		}

		this.subject.publish(this);
	}

	updateMbr(): void {
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		this.left = translateX;
		this.top = translateY;
		this.right =
			this.left +
			CARD_DIMENSIONS.width * scaleX +
			2 * this.cardIds.length;
		this.bottom = this.top + CARD_DIMENSIONS.height * scaleY;
	}

	deserialize(data: SerializedItemData): this {
		super.deserialize(data);
		this.updateCards();
		return this;
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.cards.forEach((card, index) => {
			card.render(context, {
				top: this.top,
				left: this.left,
				cardPosition: index + 1,
			});
		});
	}
}

registerItem({
	item: Deck,
	defaultData: defaultDeckData,
});
