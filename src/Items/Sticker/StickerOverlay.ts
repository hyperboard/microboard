import type { ToolOverlayDefinition } from "Overlay";
import { overlayAssetIcon } from "Overlay";

const STICKER_COLORS = [
  "#FFF475",
  "#FDBA74",
  "#A7F3D0",
  "#BFDBFE",
  "#DDD6FE",
  "#FBCFE8",
];

export const addStickerToolOverlay: ToolOverlayDefinition = {
  toolName: "AddSticker",
  label: "Sticker",
  kind: "create",
  createsItemType: "Sticker",
  family: "sticker",
  icon: {
    ...overlayAssetIcon("src/Items/Sticker/Path/Sticker.icon.svg"),
    state: {
      swatch: { kind: "toolProperty", property: "backgroundColor" },
    },
  },
  defaults: {
    controls: [
      {
        id: "stickerBackgroundColor",
        label: "Color",
        valueSource: { kind: "toolProperty", property: "backgroundColor" },
        editor: { kind: "color", palette: STICKER_COLORS, presentation: "sticker" },
        invoke: { kind: "toolProperty", property: "backgroundColor" },
      },
    ],
  },
  launch: { kind: "activate-tool" },
  surface: {
    order: 9,
  },
};
