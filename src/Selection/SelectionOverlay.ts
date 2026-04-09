import type { BaseItem } from "Items/BaseItem/BaseItem";
import {
  registerSelectionAction,
  registerSelectionActionSection,
  symbolIcon,
  styleFontSizeIcon,
} from "Overlay";

function everyItemHasRichText(items: readonly BaseItem[]): boolean {
  return items.length > 0 && items.every(item => !!item.getRichText?.());
}

registerSelectionActionSection({
  id: "selectionTextSize",
  label: "Text size",
  actionIds: ["selection.text.fontSize"],
});

registerSelectionActionSection({
  id: "selectionTextColors",
  label: "Text colors",
  actionIds: ["selection.text.color", "selection.text.highlight"],
});

registerSelectionActionSection({
  id: "selectionArrange",
  label: "Arrange",
  actionIds: ["selection.bringToFront", "selection.sendToBack"],
});

registerSelectionActionSection({
  id: "selectionActions",
  label: "Actions",
  actionIds: [
    "selection.duplicate",
    "selection.lock",
    "selection.unlock",
    "selection.delete",
  ],
});

registerSelectionAction({
  id: "selection.delete",
  label: "Delete",
  icon: symbolIcon("Delete"),
  description: "Removes the selected items from the board.",
  invoke: { kind: "selectionMethod", methodName: "removeFromBoard" },
  sectionId: "selectionActions",
  order: 4,
  isAvailable: items => items.length > 0,
});

registerSelectionAction({
  id: "selection.duplicate",
  label: "Duplicate",
  icon: symbolIcon("Duplicate"),
  description: "Duplicates the selected items.",
  invoke: { kind: "selectionMethod", methodName: "duplicate" },
  sectionId: "selectionActions",
  order: 1,
  isAvailable: items => items.length > 0,
});

registerSelectionAction({
  id: "selection.lock",
  label: "Lock",
  icon: symbolIcon("unlock"),
  description: "Locks the selected items.",
  invoke: { kind: "selectionMethod", methodName: "lock" },
  sectionId: "selectionActions",
  order: 2,
  isAvailable: items => items.length > 0 && !items.some(item => item.transformation.isLocked),
});

registerSelectionAction({
  id: "selection.unlock",
  label: "Unlock",
  icon: symbolIcon("lock"),
  description: "Unlocks the selected items.",
  invoke: { kind: "selectionMethod", methodName: "unlock" },
  sectionId: "selectionActions",
  order: 2,
  isAvailable: items => items.some(item => item.transformation.isLocked),
});

registerSelectionAction({
  id: "selection.bringToFront",
  label: "Bring to front",
  icon: symbolIcon("BringToFront"),
  description: "Moves the selection above overlapping items.",
  invoke: { kind: "selectionMethod", methodName: "bringToFront" },
  sectionId: "selectionArrange",
  order: 1,
  isAvailable: items => items.length > 0,
});

registerSelectionAction({
  id: "selection.sendToBack",
  label: "Send to back",
  icon: symbolIcon("SendToBack"),
  description: "Moves the selection behind overlapping items.",
  invoke: { kind: "selectionMethod", methodName: "sendToBack" },
  sectionId: "selectionArrange",
  order: 2,
  isAvailable: items => items.length > 0,
});

registerSelectionAction({
  id: "selection.text.fontSize",
  label: "Font size",
  icon: styleFontSizeIcon(),
  invoke: { kind: "selectionMethod", methodName: "setFontSize" },
  sectionId: "selectionTextSize",
  order: 1,
  controls: [
    {
      id: "fontSize",
      label: "Font size",
      valueSource: { kind: "selectionProperty", property: "getFontSize" },
      editor: {
        kind: "number-stepper",
        min: 8,
        max: 144,
        step: 1,
        presets: [12, 14, 16, 18, 24, 32, 48],
        unit: "px",
      },
      invoke: { kind: "selectionMethod", methodName: "setFontSize" },
    },
  ],
  isAvailable: everyItemHasRichText,
});

registerSelectionAction({
  id: "selection.text.color",
  label: "Text color",
  icon: symbolIcon("TextColor", {
    swatch: { kind: "selectionProperty", property: "getFontColor" },
  }),
  invoke: { kind: "selectionMethod", methodName: "setFontColor" },
  sectionId: "selectionTextColors",
  order: 1,
  controls: [
    {
      id: "fontColor",
      label: "Text color",
      valueSource: { kind: "selectionProperty", property: "getFontColor" },
      editor: {
        kind: "color",
        palette: ["#111111", "#FFFFFF", "#E11D48", "#2563EB", "#16A34A", "#F59E0B"],
      },
      invoke: { kind: "selectionMethod", methodName: "setFontColor" },
    },
  ],
  isAvailable: everyItemHasRichText,
});

registerSelectionAction({
  id: "selection.text.highlight",
  label: "Highlight",
  icon: symbolIcon("TextHighlight", {
    swatch: { kind: "selectionProperty", property: "getFontHighlight" },
  }),
  invoke: { kind: "selectionMethod", methodName: "setFontHighlight" },
  sectionId: "selectionTextColors",
  order: 2,
  controls: [
    {
      id: "fontHighlight",
      label: "Highlight",
      valueSource: { kind: "selectionProperty", property: "getFontHighlight" },
      editor: {
        kind: "color",
        palette: ["transparent", "#FEF08A", "#FDBA74", "#BFDBFE", "#FBCFE8", "#D9F99D"],
      },
      invoke: { kind: "selectionMethod", methodName: "setFontHighlight" },
    },
  ],
  isAvailable: everyItemHasRichText,
});
