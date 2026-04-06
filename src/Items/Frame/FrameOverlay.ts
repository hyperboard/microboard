import { Frames } from "./Basic";
import type { ToolOverlayDefinition, OverlayOptionDefinition } from "Overlay";
import { overlayAssetIcon } from "Overlay";

const frameTypeOptions: OverlayOptionDefinition[] = Object.keys(Frames).map(frameType => ({
  id: frameType,
  label: frameType === "Custom" ? "Custom" : Frames[frameType as keyof typeof Frames].name,
  value: frameType,
  icon: overlayAssetIcon(
    frameType === "Custom"
      ? "src/Items/Frame/Basic/Custom/Custom.icon.svg"
      : frameType === "A4"
        ? "src/Items/Frame/Basic/A4/A4.icon.svg"
        : frameType === "Letter"
          ? "src/Items/Frame/Basic/Letter/Letter.icon.svg"
          : frameType === "Frame16x9"
            ? "src/Items/Frame/Basic/16-9/16-9.icon.svg"
            : frameType === "Frame4x3"
              ? "src/Items/Frame/Basic/4-3/4-3.icon.svg"
              : frameType === "Frame1x1"
                ? "src/Items/Frame/Basic/1-1/1-1.icon.svg"
                : frameType === "Frame3x2"
                  ? "src/Items/Frame/Basic/3-2/3-2.icon.svg"
                  : "src/Items/Frame/Basic/9-18/9-18.icon.svg",
  ),
}));

export const addFrameToolOverlay: ToolOverlayDefinition = {
  toolName: "AddFrame",
  label: "Frame",
  kind: "create",
  createsItemType: "Frame",
  family: "frame",
  icon: overlayAssetIcon("src/Items/Frame/Frame.icon.svg"),
  defaults: {
    controls: [
      {
        id: "frameType",
        label: "Frame shape",
        valueSource: { kind: "toolProperty", property: "shape" },
        editor: {
          kind: "enum-icon",
          options: frameTypeOptions,
        },
        invoke: { kind: "toolProperty", property: "shape" },
      },
    ],
  },
  launch: { kind: "activate-tool" },
  surface: {
    order: 10,
  },
};
