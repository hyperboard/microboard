import { BaseOperation } from "Events/EventsOperations";

export type CardOperation = SetIsOpen | SetIsInDeck;

export interface SetIsOpen extends BaseOperation<{ isOpen: boolean }> {
	class: "Card";
	method: "setIsOpen";
}

export interface SetIsInDeck extends BaseOperation<{ isInDeck: boolean }> {
	class: "Card";
	method: "setIsInDeck";
}
