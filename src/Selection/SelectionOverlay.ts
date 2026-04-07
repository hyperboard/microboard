import type { BaseItem } from "Items/BaseItem/BaseItem";
import { registerSelectionAction, overlayAssetIcon, styleColorIcon, styleFontSizeIcon } from "Overlay";

function everyItemHasRichText(items: readonly BaseItem[]): boolean {
  return items.length > 0 && items.every(item => !!item.getRichText?.());
}

registerSelectionAction({
  id: "selection.delete",
  label: "Delete",
  icon: overlayAssetIcon("src/Overlay/icons/Delete.icon.svg"),
  description: "Removes the selected items from the board.",
  invoke: { kind: "selectionMethod", methodName: "removeFromBoard" },
  isAvailable: items => items.length > 0,
});

registerSelectionAction({
  id: "selection.duplicate",
  label: "Duplicate",
  icon: overlayAssetIcon("src/Overlay/icons/Duplicate.icon.svg"),
  description: "Duplicates the selected items.",
  invoke: { kind: "selectionMethod", methodName: "duplicate" },
  isAvailable: items => items.length > 0,
});

registerSelectionAction({
  id: "selection.lock",
  label: "Lock",
  icon: overlayAssetIcon("src/Overlay/icons/Lock.icon.svg"),
  description: "Locks the selected items.",
  invoke: { kind: "selectionMethod", methodName: "lock" },
  isAvailable: items => items.length > 0 && !items.some(item => item.transformation.isLocked),
});

registerSelectionAction({
  id: "selection.unlock",
  label: "Unlock",
  icon: overlayAssetIcon("src/Overlay/icons/Unlock.icon.svg"),
  description: "Unlocks the selected items.",
  invoke: { kind: "selectionMethod", methodName: "unlock" },
  isAvailable: items => items.some(item => item.transformation.isLocked),
});

registerSelectionAction({
  id: "selection.bringToFront",
  label: "Bring to front",
  icon: overlayAssetIcon("src/Overlay/icons/BringToFront.icon.svg"),
  description: "Moves the selection above overlapping items.",
  invoke: { kind: "selectionMethod", methodName: "bringToFront" },
  isAvailable: items => items.length > 0,
});

registerSelectionAction({
  id: "selection.sendToBack",
  label: "Send to back",
  icon: overlayAssetIcon("src/Overlay/icons/SendToBack.icon.svg"),
  description: "Moves the selection behind overlapping items.",
  invoke: { kind: "selectionMethod", methodName: "sendToBack" },
  isAvailable: items => items.length > 0,
});

registerSelectionAction({
  id: "selection.text.fontSize",
  label: "Font size",
  icon: styleFontSizeIcon(),
  invoke: { kind: "selectionMethod", methodName: "setFontSize" },
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
  icon: styleColorIcon({
    swatch: { kind: "selectionProperty", property: "getFontColor" },
  }),
  invoke: { kind: "selectionMethod", methodName: "setFontColor" },
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
  icon: {
    ...overlayAssetIcon("src/Items/Screen/icons/Background.icon.svg"),
    state: { swatch: { kind: "selectionProperty", property: "getFontHighlight" } },
  },
  invoke: { kind: "selectionMethod", methodName: "setFontHighlight" },
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
