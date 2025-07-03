import {BaseOperation} from "../../Events/EventsOperations";

export type BaseItemOperation = UpdateChildren;

export interface UpdateChildren extends BaseOperation<{ children: string[] }> {
  method: "updateChildren";
}
