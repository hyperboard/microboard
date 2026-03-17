import {BaseOperation} from "Events/EventsOperations";

export type BaseItemOperation = RemoveChildren | AddChildren | ToggleResizeEnabled;

export interface RemoveChildren extends BaseOperation<{ childIds: string[] }> {
  method: "removeChildren";
}

export interface AddChildren extends BaseOperation<{ childIds: string[] }> {
  method: "addChildren";
}

export interface ToggleResizeEnabled extends BaseOperation<{ resizeEnabled: boolean }> {
  method: "toggleResizeEnabled";
}
