import { BaseOperation } from "Events/EventsOperations";

export type DeckOperation = StartAnimation;

export interface StartAnimation extends BaseOperation<{timeStamp?: number}> {
	class: "Deck";
	method: "startAnimation";
}
