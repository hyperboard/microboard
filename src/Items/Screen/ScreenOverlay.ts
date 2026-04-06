import type { ItemOverlayDefinition, ToolOverlayDefinition } from "Overlay";
import { overlaySymbolIcon } from "Overlay";

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
        ...overlaySymbolIcon("screen.background"),
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
    {
      id: "screen.stroke",
      label: "Stroke",
      icon: {
        ...overlaySymbolIcon("shape.stroke"),
        state: { swatch: { kind: "itemProperty", property: "borderColor" } },
      },
      target: "each",
      controls: [
        {
          id: "borderColor",
          label: "Border color",
          valueSource: { kind: "itemProperty", property: "borderColor" },
          editor: {
            kind: "color",
            palette: ["#000000", "#FFFFFF", "#888888", "transparent"],
            allowTransparent: true,
            presentation: "square",
          },
          invoke: { kind: "setProperty", property: "borderColor" },
        },
        {
          id: "borderWidth",
          label: "Border width",
          valueSource: { kind: "itemProperty", property: "borderWidth" },
          editor: {
            kind: "number-stepper",
            min: 0,
            max: 8,
            step: 1,
            presets: [0, 1, 2, 4],
            unit: "px",
          },
          invoke: { kind: "setProperty", property: "borderWidth" },
        },
      ],
      groups: [
        {
          id: "screenStrokeStyle",
          label: "Stroke",
          icon: overlaySymbolIcon("shape.stroke"),
          controlIds: ["borderColor", "borderWidth"],
        },
      ],
    },
    {
      id: "screen.backgroundImage",
      label: "Background image",
      icon: overlaySymbolIcon("screen.backgroundImage"),
      target: "each",
      when: {
        kind: "falsy",
        source: { kind: "itemProperty", property: "backgroundUrl" },
      },
      controls: [
        {
          id: "backgroundUrl",
          label: "Background image",
          valueSource: { kind: "itemProperty", property: "backgroundUrl" },
          editor: {
            kind: "asset-upload",
            mode: "single",
            accept: ["image/*"],
          },
          invoke: { kind: "setProperty", property: "backgroundUrl" },
        },
      ],
    },
    {
      id: "screen.removeBackgroundImage",
      label: "Remove background image",
      icon: overlaySymbolIcon("screen.backgroundImage.remove"),
      target: "each",
      when: {
        kind: "truthy",
        source: { kind: "itemProperty", property: "backgroundUrl" },
      },
      invoke: {
        kind: "customMethod",
        methodName: "setBackgroundUrl",
        args: [{ kind: "static", value: "" }],
      },
    },
  ],
  sections: [
    {
      id: "screenAppearance",
      label: "Appearance",
      icon: overlaySymbolIcon("screen.background"),
      actionIds: ["screen.background", "screen.stroke", "screen.backgroundImage", "screen.removeBackgroundImage"],
    },
  ],
};

export const addScreenToolOverlay: ToolOverlayDefinition = {
  toolName: "AddScreen",
  label: "Screen",
  kind: "create",
  createsItemType: "Screen",
  family: "container",
  icon: overlaySymbolIcon("tool.screen"),
  launch: { kind: "activate-tool" },
  surface: {
    order: 2,
    group: {
      id: "gameItems",
      label: "Game items",
      icon: overlaySymbolIcon("tool.dice"),
      order: 1,
      behavior: "open-panel",
    },
    relatedToolNames: ["AddDice", "AddPouch"],
  },
};

export const addPouchToolOverlay: ToolOverlayDefinition = {
  toolName: "AddPouch",
  label: "Pouch",
  kind: "create",
  createsItemType: "Screen",
  family: "container",
  icon: overlaySymbolIcon("tool.pouch"),
  launch: { kind: "activate-tool" },
  surface: {
    order: 3,
    group: {
      id: "gameItems",
      label: "Game items",
      icon: overlaySymbolIcon("tool.dice"),
      order: 1,
      behavior: "open-panel",
    },
    relatedToolNames: ["AddDice", "AddScreen"],
  },
};
