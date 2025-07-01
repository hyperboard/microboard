import { BaseOperation } from "Events/EventsOperations";

export type DiceOperation = ChangeValueIndex | ChangeValues | SetBackgroundColor | SetBorderColor | SetBorderWidth;

interface ChangeValueIndex extends BaseOperation<{ valueIndex: number, shouldRotate: boolean, timeStamp?: number }> {
  class: "Dice";
  method: "changeValueIndex";
}

interface ChangeValues extends BaseOperation<{ values: number[] }> {
  class: "Dice";
  method: "changeValues";
}

interface SetBackgroundColor extends BaseOperation<{ backgroundColor: string }> {
  class: "Dice";
  method: "setBackgroundColor";
}

interface SetBorderColor extends BaseOperation<{ borderColor: string }> {
  class: "Dice";
  method: "setBorderColor";
}

export interface SetBorderWidth extends BaseOperation<{ borderWidth: number }> {
  class: "Dice";
  method: "setBorderWidth";
}
