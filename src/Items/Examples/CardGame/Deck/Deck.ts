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
};

export class Deck extends BaseItem {
	readonly subject = new Subject<Deck>();
	shouldUseCustomRender = false;

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
						x: this.left + (this.index?.list().length || 0) * 2,
						y: this.top,
					})
					this.board.items.index.remove(foundItem);
					foundItem.parent = this.getId();
					this.index?.insert(foundItem);
				}
			}
		});
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
					foundItem.transformation.apply({
						class: 'Transformation',
						method: 'translateTo',
						item: [this.id],
						x: this.left,
						y: this.top - this.getHeight() / 2,
					})
					this.index?.remove(foundItem);
					foundItem.parent = "Board";
					this.board.items.index.insert(foundItem);
				}
			}
		});
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

	apply(op: DeckOperation): void {
		super.apply(op);
		this.subject.publish(this);
	}

	updateMbr(): void {
		const { translateX, translateY } =
			this.transformation.matrix;
		const items = this.index!.list();
		const itemsMbr = items[0]?.getMbr().combine(items.slice(1).map(item => item.getMbr()));
		this.left = translateX;
		this.top = translateY;
		this.right = translateX + (itemsMbr?.getWidth() || 0);
		this.bottom = translateY + (itemsMbr?.getHeight() || 0);
	}

	deserialize(data: SerializedItemData): this {
		super.deserialize(data);
		this.updateMbr();
		this.subject.publish(this);
		return this;
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		super.render(context);
	}
}

registerItem({
	item: Deck,
	defaultData: defaultDeckData,
});
