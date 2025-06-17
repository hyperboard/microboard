import { BaseOperation } from "Events/EventsOperations";

export type CounterOperation = UpdateCounter;

export interface UpdateCounter extends BaseOperation<{ count: number }> {
	class: "Counter";
	method: "updateCounter";
}
