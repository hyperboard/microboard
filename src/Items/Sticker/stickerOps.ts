import { ColorValue } from "Color";
import { Operation } from "Events";
import { StickerOperation } from "./StickerOperation";

interface ItemLike {
  getId(): string;
}

export const stickerOps = {
  setBackgroundColor(items: ItemLike[], backgroundColor: ColorValue): Operation {
    return {
      class: "Sticker",
      method: "setBackgroundColor",
      item: items.map(i => i.getId()),
      backgroundColor,
    } as StickerOperation;
  },
};
