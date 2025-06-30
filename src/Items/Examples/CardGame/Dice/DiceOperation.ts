import { BaseOperation } from "Events/EventsOperations";

export type DiceOperation = ChangeValue | ChangeValuesRange | SetIsRotating | SetBackgroundColor | SetBorderColor | SetBorderWidth;

interface ChangeValue extends BaseOperation<{ value: number }> {
  class: "Dice";
  method: "changeValue";
}

interface ChangeValuesRange extends BaseOperation<{ min: number, max: number }> {
  class: "Dice";
  method: "changeValuesRange";
}

interface SetIsRotating extends BaseOperation<{ isRotating: boolean }> {
  class: "Dice";
  method: "setIsRotating";
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
