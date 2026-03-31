import { BaseOperation } from "Events/EventsOperations";
import { TransformationOperation } from "Items/Transformation/TransformationOperations";

export type DeckOperation = StartAnimation | TransformationOperation;

export interface StartAnimation extends BaseOperation<{timeStamp?: number}> {
	class: "Deck";
	method: "startAnimation";
}
