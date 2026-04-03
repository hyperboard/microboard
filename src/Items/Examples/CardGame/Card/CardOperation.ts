import { BaseOperation } from "Events/EventsOperations";
import { TransformationOperation } from "Geometry/Transformation/TransformationOperations";

export type CardOperation = SetIsOpen | SetIsInDeck | TransformationOperation;

export interface SetIsOpen extends BaseOperation<{ isOpen: boolean }> {
	class: "Card";
	method: "setIsOpen";
}

export interface SetIsInDeck extends BaseOperation<{ isInDeck: boolean }> {
	class: "Card";
	method: "setIsInDeck";
}
