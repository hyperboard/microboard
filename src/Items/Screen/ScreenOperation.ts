import { BaseOperation } from "Events/EventsOperations";

export type ScreenOperation = SetBackgroundColor | SetBorderColor | SetBorderWidth | SetBackgroundUrl;

interface SetBackgroundColor extends BaseOperation<{ backgroundColor: string }> {
  class: "Screen";
  method: "setBackgroundColor";
}

interface SetBorderColor extends BaseOperation<{ borderColor: string }> {
  class: "Screen";
  method: "setBorderColor";
}

export interface SetBorderWidth extends BaseOperation<{ borderWidth: number }> {
  class: "Screen";
  method: "setBorderWidth";
}

export interface SetBackgroundUrl extends BaseOperation<{ backgroundUrl?: string }> {
  class: "Screen";
  method: "setBackgroundUrl";
}
