import {
  styleFillIcon,
  type ItemOverlayDefinition,
  type ToolOverlayDefinition,
} from "Overlay";
import { overlayAssetIcon } from "Overlay";

const COLOR_PALETTE = [
  "#FFFFFF",
  "#111111",
  "#FF4444",
  "#44BB44",
  "#4466FF",
  "#FFDD00",
];

export const diceOverlay: ItemOverlayDefinition = {
  itemType: "Dice",
  actions: [
    {
      id: "dice.throw",
      label: "Throw dice",
      icon: overlayAssetIcon("src/Items/Dice/icons/Throw.icon.svg"),
      target: "each",
      invoke: { kind: "customMethod", methodName: "throwDice" },
    },
    {
      id: "dice.range",
      label: "Range",
      icon: overlayAssetIcon("src/Items/Dice/icons/Range.icon.svg"),
      target: "each",
      controls: [
        {
          id: "values",
          label: "Sides",
          valueSource: { kind: "itemProperty", property: "values" },
          editor: {
            kind: "number-stepper",
            min: 2,
            max: 100,
            step: 1,
            presets: [4, 6, 8, 10, 12, 20],
          },
          valueAdapter: { kind: "rangeArray", start: 1 },
          invoke: { kind: "setProperty", property: "values" },
        },
      ],
    },
    {
      id: "dice.fill",
      label: "Fill",
      icon: styleFillIcon({
        swatch: { kind: "itemProperty", property: "backgroundColor" },
      }),
      target: "each",
      controls: [
        {
          id: "backgroundColor",
          label: "Fill",
          valueSource: { kind: "itemProperty", property: "backgroundColor" },
          editor: { kind: "color", palette: COLOR_PALETTE },
          invoke: { kind: "setProperty", property: "backgroundColor" },
        },
      ],
    },
  ],
  sections: [
    {
      id: "diceActions",
      label: "Dice",
      icon: overlayAssetIcon("src/Items/Dice/icons/Throw.icon.svg"),
      actionIds: ["dice.throw", "dice.range", "dice.fill"],
    },
  ],
};

export const addDiceToolOverlay: ToolOverlayDefinition = {
  toolName: "AddDice",
  label: "Dice",
  kind: "create",
  createsItemType: "Dice",
  family: "game",
  icon: overlayAssetIcon("src/Items/Dice/icons/Tool.icon.svg"),
  launch: { kind: "activate-tool" },
  surface: {
    order: 1,
    group: {
      id: "gameItems",
      label: "Game items",
      icon: overlayAssetIcon("src/Items/Dice/icons/Tool.icon.svg"),
      order: 1,
      behavior: "open-panel",
    },
    relatedToolNames: ["AddScreen", "AddPouch"],
  },
};
