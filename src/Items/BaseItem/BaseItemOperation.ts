import {BaseOperation} from "../../Events/EventsOperations";

export type BaseItemOperation = RemoveChildren | AddChildren;

export interface RemoveChildren extends BaseOperation<{ childIds: string[] }> {
  method: "removeChildren";
}

export interface AddChildren extends BaseOperation<{ childIds: string }> {
  method: "addChildren";
}
