import type { ToolOverlayDefinition } from "Overlay";
import { overlayAssetIcon, symbolIcon } from "Overlay";
import { CONTRAST_PALETTE_LIST } from "Color";

const STICKER_COLORS = CONTRAST_PALETTE_LIST.map((pair) => pair.id);

export const addStickerToolOverlay: ToolOverlayDefinition = {
  toolName: "AddSticker",
  label: "Sticker",
  kind: "create",
  createsItemType: "Sticker",
  family: "sticker",
  icon: {
    ...symbolIcon("tool.sticker"),
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
