import { Frames } from "./Basic";
import type { ToolOverlayDefinition, OverlayOptionDefinition } from "Overlay";
import { symbolIcon } from "Overlay";

const frameTypeOptions: OverlayOptionDefinition[] = Object.keys(Frames).map(frameType => ({
  id: frameType,
  label: frameType === "Custom" ? "Custom" : Frames[frameType as keyof typeof Frames].name,
  value: frameType,
  icon: symbolIcon(`frame.${frameType}`),
}));

export const addFrameToolOverlay: ToolOverlayDefinition = {
  toolName: "AddFrame",
  label: "Frame",
  kind: "create",
  createsItemType: "Frame",
  family: "frame",
  icon: symbolIcon("tool.frame"),
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
