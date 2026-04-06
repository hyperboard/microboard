import {
  styleFontSizeIcon,
  type ItemOverlayDefinition,
  type ToolOverlayDefinition,
} from "Overlay";
import { overlayAssetIcon } from "Overlay";

export const richTextOverlay: ItemOverlayDefinition = {
  itemType: "RichText",
  actions: [
    {
      id: "text.fontSize",
      label: "Font size",
      icon: styleFontSizeIcon(),
      target: "each",
      controls: [
        {
          id: "fontSize",
          label: "Font size",
          editor: {
            kind: "number-stepper",
            min: 8,
            max: 144,
            step: 1,
            presets: [12, 14, 16, 18, 24, 32, 48],
            unit: "px",
          },
          invoke: { kind: "operation", class: "RichText", method: "setFontSize" },
        },
      ],
    },
  ],
  sections: [
    {
      id: "textTypography",
      label: "Typography",
      icon: overlayAssetIcon("src/Items/RichText/icons/FontSize.icon.svg"),
      actionIds: ["text.fontSize"],
    },
  ],
};

export const addTextToolOverlay: ToolOverlayDefinition = {
  toolName: "AddText",
  label: "Text",
  kind: "create",
  createsItemType: "RichText",
  family: "text",
  icon: overlayAssetIcon("src/Items/RichText/icons/Text.icon.svg"),
  description: "Creates editable rich text. The current first pass has no pre-placement defaults on this tool.",
  launch: { kind: "activate-tool" },
  surface: {
    order: 6,
  },
};
