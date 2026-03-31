import { ColorValue } from "Color";
import { Operation } from "Events";
import { DrawingOperation } from "./DrawingOperation";
import { BorderStyle, BorderWidth } from "../Path";

interface ItemLike {
  getId(): string;
  getStrokeWidth(): BorderWidth;
}

export const drawingOps = {
  setStrokeColor(items: ItemLike[], color: ColorValue): Operation {
    return {
      class: "Drawing",
      method: "setStrokeColor",
      item: items.map(i => i.getId()),
      color,
    } as DrawingOperation;
  },

  setStrokeWidth(items: ItemLike[], width: BorderWidth): Operation {
    // Drawing operation needs prevWidth. For bulk operations in selection, 
    // we use the first item's width (consistent with Selection.getStrokeWidth).
    return {
      class: "Drawing",
      method: "setStrokeWidth",
      item: items.map(i => i.getId()),
      width,
      prevWidth: items[0]?.getStrokeWidth() ?? 1,
    } as DrawingOperation;
  },

  setBorderStyle(items: ItemLike[], style: BorderStyle): Operation {
    return {
      class: "Drawing",
      method: "setStrokeStyle",
      item: items.map(i => i.getId()),
      style,
    } as DrawingOperation;
  },

  setStrokeOpacity(items: ItemLike[], opacity: number): Operation {
    return {
      class: "Drawing",
      method: "setStrokeOpacity",
      item: items.map(i => i.getId()),
      opacity,
    } as DrawingOperation;
  },
};
