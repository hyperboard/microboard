import { BaseOperation } from "Events/EventsOperations";
import { TransformationOperation } from "Items/Transformation/TransformationOperations";

export type CounterOperation = UpdateCounter | TransformationOperation;

export interface UpdateCounter extends BaseOperation<{ count: number }> {
	class: "Counter";
	method: "updateCounter";
}
