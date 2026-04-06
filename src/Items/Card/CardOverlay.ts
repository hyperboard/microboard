import type { ItemOverlayDefinition } from "Overlay";
import { overlaySymbolIcon } from "Overlay";

export const cardOverlay: ItemOverlayDefinition = {
  itemType: "Card",
  actions: [
    {
      id: "card.flip",
      label: "Flip card",
      icon: overlaySymbolIcon("card.flip"),
      target: "each",
      invoke: { kind: "customMethod", methodName: "toggleIsOpen" },
    },
    {
      id: "card.rotateCcw",
      label: "Rotate 90 counter clockwise",
      icon: overlaySymbolIcon("card.rotateCcw"),
      target: "each",
      invoke: {
        kind: "customMethod",
        methodName: "rotate",
        args: [{ kind: "static", value: -90 }],
      },
    },
    {
      id: "card.rotateCw",
      label: "Rotate 90 clockwise",
      icon: overlaySymbolIcon("card.rotateCw"),
      target: "each",
      invoke: {
        kind: "customMethod",
        methodName: "rotate",
        args: [{ kind: "static", value: 90 }],
      },
    },
  ],
};
