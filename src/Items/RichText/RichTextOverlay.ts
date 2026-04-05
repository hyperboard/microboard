import type { ItemOverlayDefinition, ToolOverlayDefinition } from "Overlay";

export const richTextOverlay: ItemOverlayDefinition = {
  itemType: "RichText",
  actions: [
    {
      id: "text.fontSize",
      label: "Font size",
      icon: { kind: "symbol", key: "text.fontSize" },
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
};

export const addTextToolOverlay: ToolOverlayDefinition = {
  toolName: "AddText",
  label: "Text",
  kind: "create",
  createsItemType: "RichText",
  family: "text",
  icon: { kind: "symbol", key: "tool.text" },
  description: "Creates editable rich text. The current first pass has no pre-placement defaults on this tool.",
};
