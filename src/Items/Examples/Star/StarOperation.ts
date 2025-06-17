import { BaseOperation } from "Events/EventsOperations";

export type StarOperation = ToggleShine;

interface ToggleShine extends BaseOperation<{ isShining: boolean }> {
	class: "Star";
	method: "toggleShine";
}
