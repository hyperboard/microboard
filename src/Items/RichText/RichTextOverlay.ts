import {
  styleFontSizeIcon,
  type ItemOverlayDefinition,
  type ToolOverlayDefinition,
} from "Overlay";
import { overlaySymbolIcon } from "Overlay";

export const richTextOverlay: ItemOverlayDefinition = {
  itemType: "RichText",
  actions: [
    {
      id: "text.fontSize",
      label: "Font size",
      icon: styleFontSizeIcon(),
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
      icon: overlaySymbolIcon("text.fontSize"),
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
  icon: overlaySymbolIcon("tool.text"),
  description: "Creates editable rich text. The current first pass has no pre-placement defaults on this tool.",
  launch: { kind: "activate-tool" },
  surface: {
    order: 6,
  },
};
