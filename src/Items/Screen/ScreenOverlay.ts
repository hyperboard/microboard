import type { ItemOverlayDefinition, ToolOverlayDefinition } from "Overlay";

const SCREEN_PALETTE = [
  "#FFFFFF",
  "#F0F0F0",
  "#222222",
  "transparent",
];

export const screenOverlay: ItemOverlayDefinition = {
  itemType: "Screen",
  actions: [
    {
      id: "screen.background",
      label: "Background",
      icon: {
        kind: "symbol",
        key: "screen.background",
        state: { swatch: { kind: "itemProperty", property: "backgroundColor" } },
      },
      target: "each",
      controls: [
        {
          id: "backgroundColor",
          label: "Background color",
          valueSource: { kind: "itemProperty", property: "backgroundColor" },
          editor: {
            kind: "color",
            palette: SCREEN_PALETTE,
            allowTransparent: true,
          },
          invoke: { kind: "setProperty", property: "backgroundColor" },
        },
      ],
    },
  ],
};

export const addScreenToolOverlay: ToolOverlayDefinition = {
  toolName: "AddScreen",
  label: "Screen",
  kind: "create",
  createsItemType: "Screen",
  family: "container",
  icon: { kind: "symbol", key: "tool.screen" },
};

export const addPouchToolOverlay: ToolOverlayDefinition = {
  toolName: "AddPouch",
  label: "Pouch",
  kind: "create",
  createsItemType: "Screen",
  family: "container",
  icon: { kind: "symbol", key: "tool.pouch" },
};
