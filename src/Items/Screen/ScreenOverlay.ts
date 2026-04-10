import type { ItemOverlayDefinition, ToolOverlayDefinition } from "Overlay";
import { overlayAssetIcon } from "Overlay";
import { CONTRAST_PALETTE_LIST } from "Color";

const SCREEN_PALETTE = [...CONTRAST_PALETTE_LIST.map((pair) => pair.id), "transparent"];

export const screenOverlay: ItemOverlayDefinition = {
  itemType: "Screen",
  actions: [
    {
      id: "screen.background",
      label: "Background",
      icon: {
        ...overlayAssetIcon("src/Items/Screen/icons/Background.icon.svg"),
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
        ...overlayAssetIcon("src/Items/Shape/icons/Stroke.icon.svg"),
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
            palette: SCREEN_PALETTE,
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
          icon: overlayAssetIcon("src/Items/Shape/icons/Stroke.icon.svg"),
          controlIds: ["borderColor", "borderWidth"],
        },
      ],
    },
    {
      id: "screen.backgroundImage",
      label: "Background image",
      icon: overlayAssetIcon("src/Items/Screen/icons/BackgroundImage.icon.svg"),
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
      icon: overlayAssetIcon("src/Items/Screen/icons/BackgroundImageRemove.icon.svg"),
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
      icon: overlayAssetIcon("src/Items/Screen/icons/Background.icon.svg"),
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
  icon: overlayAssetIcon("src/Items/Screen/icons/Tool.icon.svg"),
  launch: { kind: "activate-tool" },
  surface: {
    order: 2,
    group: {
      id: "gameItems",
      label: "Game items",
      icon: overlayAssetIcon("src/Items/Dice/icons/Tool.icon.svg"),
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
  icon: overlayAssetIcon("src/Items/Screen/icons/Pouch.icon.svg"),
  launch: { kind: "activate-tool" },
  surface: {
    order: 3,
    group: {
      id: "gameItems",
      label: "Game items",
      icon: overlayAssetIcon("src/Items/Dice/icons/Tool.icon.svg"),
      order: 1,
      behavior: "open-panel",
    },
    relatedToolNames: ["AddDice", "AddScreen"],
  },
};
