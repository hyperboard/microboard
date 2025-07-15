import { BaseOperation } from "Events/EventsOperations";

export type HandOperation = SetBackgroundColor | SetBorderColor | SetBorderWidth;

interface SetBackgroundColor extends BaseOperation<{ backgroundColor: string }> {
  class: "Hand";
  method: "setBackgroundColor";
}

interface SetBorderColor extends BaseOperation<{ borderColor: string }> {
  class: "Hand";
  method: "setBorderColor";
}

export interface SetBorderWidth extends BaseOperation<{ borderWidth: number }> {
  class: "Hand";
  method: "setBorderWidth";
}
