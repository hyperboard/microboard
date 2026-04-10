import { CONNECTOR_POINTER_TYPES, ConnectorLineStyles, ConnectionLineWidths } from "./ConnectorTypes";
import type { BorderStyle } from "Geometry/Path";
import type { ItemOverlayDefinition, OverlayControlDefinition, OverlayOptionDefinition, ToolOverlayDefinition } from "Overlay";
import { overlayAssetIcon, symbolIcon } from "Overlay";
import { CONTRAST_PALETTE_LIST } from "Color";

const COLOR_PALETTE = CONTRAST_PALETTE_LIST.map((pair) => pair.id);

const connectorAssetIcon = (file: string) =>
  overlayAssetIcon(`src/Items/Connector/icons/${file}.icon.svg`);

const lineStyleAssetIcons: Record<string, ReturnType<typeof connectorAssetIcon>> = {
  straight: connectorAssetIcon("LineStraight"),
  curved: connectorAssetIcon("LineCurved"),
  orthogonal: connectorAssetIcon("LineOrthogonal"),
};

const pointerAssetIcons: Record<string, ReturnType<typeof connectorAssetIcon>> = {
  None: connectorAssetIcon("PointerNone"),
  ArrowThin: connectorAssetIcon("PointerArrowThin"),
  ArrowHeavy: connectorAssetIcon("PointerArrowHeavy"),
  TriangleFilled: connectorAssetIcon("PointerTriangleFilled"),
  TriangleOutline: connectorAssetIcon("PointerTriangleOutline"),
  CircleFilled: connectorAssetIcon("PointerCircleFilled"),
  CircleOutline: connectorAssetIcon("PointerCircleOutline"),
  DiamondFilled: connectorAssetIcon("PointerDiamondFilled"),
  DiamondOutline: connectorAssetIcon("PointerDiamondOutline"),
};

const lineStyleOptions: OverlayOptionDefinition[] = ConnectorLineStyles.map(style => ({
  id: style,
  label: style[0].toUpperCase() + style.slice(1),
  value: style,
  icon: lineStyleAssetIcons[style],
}));

const lineWidthOptions: OverlayOptionDefinition[] = ConnectionLineWidths.map(width => ({
  id: `${width}`,
  label: `${width}px`,
  value: width,
}));

const pointerOptions: OverlayOptionDefinition[] = CONNECTOR_POINTER_TYPES.map(pointer => ({
  id: pointer,
  label: pointer,
  value: pointer,
  icon: pointerAssetIcons[pointer],
}));

const borderStyleOptions: OverlayOptionDefinition[] = (["solid", "dot", "dash"] as BorderStyle[]).map(style => ({
  id: style,
  label: style,
  value: style,
  icon: overlayAssetIcon(
    style === "solid"
      ? "src/Items/Shape/icons/StrokeSolid.icon.svg"
      : style === "dot"
        ? "src/Items/Shape/icons/StrokeDot.icon.svg"
        : "src/Items/Shape/icons/StrokeDash.icon.svg",
  ),
}));

const connectorStyleControls: OverlayControlDefinition[] = [
  {
    id: "lineColor",
    label: "Color",
    valueSource: { kind: "itemProperty", property: "lineColor" },
    editor: { kind: "color", palette: COLOR_PALETTE },
    invoke: { kind: "setProperty", property: "lineColor" },
  },
  {
    id: "lineStyle",
    label: "Line type",
    valueSource: { kind: "itemProperty", property: "lineStyle" },
    editor: { kind: "enum-icon", options: lineStyleOptions },
    invoke: { kind: "setProperty", property: "lineStyle" },
  },
  {
    id: "lineWidth",
    label: "Width",
    valueSource: { kind: "itemProperty", property: "lineWidth" },
    editor: {
      kind: "number-stepper",
      min: 1,
      max: 12,
      step: 1,
      presets: ConnectionLineWidths as unknown as number[],
      unit: "px",
    },
    invoke: { kind: "setProperty", property: "lineWidth" },
  },
  {
    id: "borderStyle",
    label: "Pattern",
    valueSource: { kind: "itemProperty", property: "borderStyle" },
    editor: { kind: "enum-list", options: borderStyleOptions },
    invoke: { kind: "setProperty", property: "borderStyle" },
  },
  {
    id: "startPointerStyle",
    label: "Start arrow",
    valueSource: { kind: "itemProperty", property: "startPointerStyle" },
    editor: { kind: "enum-icon", options: pointerOptions },
    invoke: { kind: "setProperty", property: "startPointerStyle" },
  },
  {
    id: "endPointerStyle",
    label: "End arrow",
    valueSource: { kind: "itemProperty", property: "endPointerStyle" },
    editor: { kind: "enum-icon", options: pointerOptions },
    invoke: { kind: "setProperty", property: "endPointerStyle" },
  },
  {
    id: "smartJump",
    label: "Smart jump",
    icon: connectorAssetIcon("SmartJump"),
    valueSource: { kind: "itemProperty", property: "smartJump" },
    editor: { kind: "toggle", trueLabel: "On", falseLabel: "Off" },
    invoke: { kind: "setProperty", property: "smartJump" },
  },
];

const connectorToolControls: OverlayControlDefinition[] = [
  {
    id: "toolLineStyle",
    label: "Line type",
    valueSource: { kind: "toolProperty", property: "lineStyle" },
    editor: { kind: "enum-icon", options: lineStyleOptions },
    invoke: { kind: "toolProperty", property: "lineStyle" },
  },
  {
    id: "toolLineColor",
    label: "Color",
    valueSource: { kind: "toolProperty", property: "lineColor" },
    editor: { kind: "color", palette: COLOR_PALETTE },
    invoke: { kind: "toolProperty", property: "lineColor" },
  },
  {
    id: "toolLineWidth",
    label: "Width",
    valueSource: { kind: "toolProperty", property: "lineWidth" },
    editor: {
      kind: "number-stepper",
      min: 1,
      max: 12,
      step: 1,
      presets: ConnectionLineWidths as unknown as number[],
      unit: "px",
    },
    invoke: { kind: "toolProperty", property: "lineWidth" },
  },
  {
    id: "toolBorderStyle",
    label: "Pattern",
    valueSource: { kind: "toolProperty", property: "strokeStyle" },
    editor: { kind: "enum-list", options: borderStyleOptions },
    invoke: { kind: "toolProperty", property: "strokeStyle" },
  },
  {
    id: "toolStartPointerStyle",
    label: "Start arrow",
    valueSource: { kind: "toolProperty", property: "startPointer" },
    editor: { kind: "enum-icon", options: pointerOptions },
    invoke: { kind: "toolProperty", property: "startPointer" },
  },
  {
    id: "toolEndPointerStyle",
    label: "End arrow",
    valueSource: { kind: "toolProperty", property: "endPointer" },
    editor: { kind: "enum-icon", options: pointerOptions },
    invoke: { kind: "toolProperty", property: "endPointer" },
  },
  {
    id: "toolSmartJump",
    label: "Smart jump",
    icon: connectorAssetIcon("SmartJump"),
    valueSource: { kind: "toolProperty", property: "smartJump" },
    editor: { kind: "toggle", trueLabel: "On", falseLabel: "Off" },
    invoke: { kind: "toolProperty", property: "smartJump" },
  },
];

export const connectorOverlay: ItemOverlayDefinition = {
  itemType: "Connector",
  actions: [
    {
      id: "connector.switchPointers",
      label: "Switch arrows",
      icon: symbolIcon("Switch"),
      target: "selection",
      invoke: { kind: "operation", class: "Connector", method: "switchPointers" },
    },
    {
      id: "connector.style",
      label: "Connector style",
      icon: connectorAssetIcon("Style"),
      target: "each",
      controls: connectorStyleControls,
      groups: [
        {
          id: "connectorStyle",
          label: "Connector style",
          icon: connectorAssetIcon("Style"),
          controlIds: connectorStyleControls.map(control => control.id),
        },
      ],
    },
  ],
  sections: [
    {
      id: "connectorArrows",
      label: "Arrows",
      icon: connectorAssetIcon("Style"),
      actionIds: ["connector.switchPointers", "connector.style"],
    },
  ],
};

export const addConnectorToolOverlay: ToolOverlayDefinition = {
  toolName: "AddConnector",
  label: "Connector",
  kind: "create",
  createsItemType: "Connector",
  family: "connector",
  icon: {
    ...connectorAssetIcon("Tool"),
    state: {
      swatch: { kind: "toolProperty", property: "lineColor" },
      note: "UI can tint or swatch the connector icon from the pending line color.",
    },
  },
  defaults: {
    controls: connectorToolControls,
    groups: [
      {
        id: "connectorToolQuickDefaults",
        label: "Connector quick defaults",
        icon: connectorAssetIcon("LineStraight"),
        controlIds: ["toolLineStyle"],
        description: "Primary defaults that match the compact create-surface picker.",
      },
      {
        id: "connectorToolAdvancedDefaults",
        label: "Connector defaults",
        icon: connectorAssetIcon("Style"),
        controlIds: connectorToolControls.map(control => control.id),
        description: "Extended defaults available in richer create flows.",
      },
    ],
  },
  launch: { kind: "activate-tool" },
  surface: {
    order: 8,
  },
};
