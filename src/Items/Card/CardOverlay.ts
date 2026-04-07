import type { ItemOverlayDefinition, ToolOverlayDefinition } from "Overlay";
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

export const addCardToolOverlay: ToolOverlayDefinition = {
  toolName: "AddCard",
  label: "Card",
  kind: "create",
  createsItemType: "Card",
  family: "game",
  icon: overlayAssetIcon("src/Items/Card/icons/Tool.icon.svg"),
  launch: {
    kind: "workflow",
    workflow: {
      kind: "property-sheet",
      description: "Upload front and back images for one or more cards.",
      submitLabel: "Create cards",
      controls: [
        {
          id: "cardArtwork",
          label: "Card artwork",
          editor: {
            kind: "asset-upload",
            mode: "paired",
            fields: [
              {
                id: "face",
                label: "Front",
                accept: ["image/*"],
                required: true,
              },
              {
                id: "back",
                label: "Back",
                accept: ["image/*"],
                required: true,
              },
            ],
          },
        },
      ],
      submit: {
        kind: "create-items",
        itemType: "Card",
        strategy: "per-upload-entry",
        placement: "stagger-from-pointer",
        properties: [
          {
            property: "faceUrl",
            source: { kind: "uploadField", controlId: "cardArtwork", fieldId: "face" },
          },
          {
            property: "backsideUrl",
            source: { kind: "uploadField", controlId: "cardArtwork", fieldId: "back" },
          },
        ],
      },
    },
  },
  surface: {
    order: 4,
    group: {
      id: "gameItems",
      label: "Game items",
      icon: overlayAssetIcon("src/Items/Dice/icons/Tool.icon.svg"),
      order: 1,
      behavior: "open-panel",
    },
    relatedToolNames: ["AddDice", "AddScreen", "AddPouch"],
  },
};
