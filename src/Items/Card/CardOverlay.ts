import type { ItemOverlayDefinition } from "Overlay";
import { overlayAssetIcon } from "Overlay";

export const cardOverlay: ItemOverlayDefinition = {
  itemType: "Card",
  actions: [
    {
      id: "card.flip",
      label: "Flip card",
      icon: overlayAssetIcon("src/Items/Card/icons/Flip.icon.svg"),
      target: "each",
      invoke: { kind: "customMethod", methodName: "toggleIsOpen" },
    },
    {
      id: "card.rotateCcw",
      label: "Rotate 90 counter clockwise",
      icon: overlayAssetIcon("src/Items/Card/icons/RotateCcw.icon.svg"),
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
      icon: overlayAssetIcon("src/Items/Card/icons/RotateCw.icon.svg"),
      target: "each",
      invoke: {
        kind: "customMethod",
        methodName: "rotate",
        args: [{ kind: "static", value: 90 }],
      },
    },
  ],
};
