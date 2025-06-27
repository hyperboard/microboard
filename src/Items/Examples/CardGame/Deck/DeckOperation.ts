import { BaseOperation } from "Events/EventsOperations";

export type DeckOperation = AddCards | RemoveCards;

export interface AddCards
	extends BaseOperation<{
		cardIds: string[];
		shouldReplaceExistingCards: boolean;
	}> {
	class: "Deck";
	method: "addCards";
}

export interface RemoveCards extends BaseOperation<{ cardIds: string[] }> {
	class: "Deck";
	method: "removeCards";
}
