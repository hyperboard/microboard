import { conf } from "Settings";
import type { ToolOverlayDefinition } from "Overlay";
import { overlaySymbolIcon } from "Overlay";

const COLOR_PALETTE = [
  "#111111",
  "#FF6B6B",
  "#FFD166",
  "#06D6A0",
  "#118AB2",
  "#7B61FF",
  "transparent",
];

const strokeControls = [
  {
    id: "strokeColor",
    label: "Color",
    valueSource: { kind: "toolProperty" as const, property: "strokeColor" },
    editor: { kind: "color" as const, palette: COLOR_PALETTE, allowTransparent: true },
    invoke: { kind: "toolProperty" as const, property: "strokeColor" },
  },
  {
    id: "strokeWidth",
    label: "Width",
    valueSource: { kind: "toolProperty" as const, property: "strokeWidth" },
    editor: {
      kind: "slider" as const,
      min: 1,
      max: 48,
      step: 1,
      unit: "px",
    },
    invoke: { kind: "toolProperty" as const, property: "strokeWidth" },
  },
  {
    id: "strokeStyle",
    label: "Pattern",
    valueSource: { kind: "toolProperty" as const, property: "strokeStyle" },
    editor: {
      kind: "enum-list" as const,
      options: [
        { id: "solid", label: "Solid", value: "solid" },
        { id: "dot", label: "Dot", value: "dot" },
        { id: "dash", label: "Dash", value: "dash" },
      ],
    },
    invoke: { kind: "toolProperty" as const, property: "strokeStyle" },
  },
];

export const addDrawingToolOverlay: ToolOverlayDefinition = {
  toolName: "AddDrawing",
  label: "Pen",
  kind: "create",
  family: "drawing",
  createsItemType: "Drawing",
  icon: {
    ...overlaySymbolIcon("tool.pen"),
    state: {
      swatch: { kind: "toolProperty", property: "strokeColor" },
      note: "UI can show the pending pen color in the icon.",
    },
  },
  defaults: {
    controls: strokeControls,
    groups: [
      {
        id: "drawingDefaults",
        label: "Pen defaults",
        icon: overlaySymbolIcon("tool.pen"),
        controlIds: strokeControls.map(control => control.id),
      },
    ],
  },
  launch: { kind: "activate-tool" },
  surface: {
    order: 1,
    group: {
      id: "drawingTools",
      label: "Drawing",
      icon: overlaySymbolIcon("tool.pen"),
      order: 5,
      behavior: "activate-last-used",
    },
    relatedToolNames: ["AddHighlighter", "Eraser"],
  },
};

export const addHighlighterToolOverlay: ToolOverlayDefinition = {
  toolName: "AddHighlighter",
  label: "Highlighter",
  kind: "create",
  family: "drawing",
  createsItemType: "Drawing",
  icon: {
    ...overlaySymbolIcon("tool.highlighter"),
    state: {
      swatch: { kind: "toolProperty", property: "strokeColor" },
      note: "UI can show the pending highlighter color in the icon.",
    },
  },
  defaults: {
    controls: strokeControls,
    groups: [
      {
        id: "highlighterDefaults",
        label: "Highlighter defaults",
        icon: overlaySymbolIcon("tool.highlighter"),
        controlIds: strokeControls.map(control => control.id),
      },
    ],
  },
  launch: { kind: "activate-tool" },
  surface: {
    order: 2,
    group: {
      id: "drawingTools",
      label: "Drawing",
      icon: overlaySymbolIcon("tool.pen"),
      order: 5,
      behavior: "activate-last-used",
    },
    relatedToolNames: ["AddDrawing", "Eraser"],
  },
};

export const eraserToolOverlay: ToolOverlayDefinition = {
  toolName: "Eraser",
  label: "Eraser",
  kind: "mode",
  family: "drawing",
  icon: overlaySymbolIcon("tool.eraser"),
  defaults: {
    controls: [
      {
        id: "eraserSize",
        label: "Size",
        valueSource: { kind: "toolProperty", property: "strokeWidth" },
        editor: {
          kind: "slider",
          min: 1,
          max: conf.ERASER_STROKE_WIDTH * 4,
          step: 1,
          unit: "px",
        },
        invoke: { kind: "toolProperty", property: "strokeWidth" },
      },
    ],
  },
  launch: { kind: "activate-tool" },
  surface: {
    order: 3,
    group: {
      id: "drawingTools",
      label: "Drawing",
      icon: overlaySymbolIcon("tool.pen"),
      order: 5,
      behavior: "activate-last-used",
    },
    relatedToolNames: ["AddDrawing", "AddHighlighter"],
  },
};
