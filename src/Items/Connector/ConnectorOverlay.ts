import { CONNECTOR_POINTER_TYPES, ConnectorLineStyles, ConnectionLineWidths } from "./ConnectorTypes";
import type { BorderStyle } from "Geometry/Path";
import type { ItemOverlayDefinition, OverlayControlDefinition, OverlayOptionDefinition, ToolOverlayDefinition } from "Overlay";

const COLOR_PALETTE = [
  "#111111",
  "#FFFFFF",
  "#FF6B6B",
  "#FFD166",
  "#06D6A0",
  "#118AB2",
  "#7B61FF",
];

const symbolIcon = (key: string) => ({ kind: "symbol" as const, key });

const lineStyleOptions: OverlayOptionDefinition[] = ConnectorLineStyles.map(style => ({
  id: style,
  label: style[0].toUpperCase() + style.slice(1),
  value: style,
  icon: symbolIcon(`connector.lineStyle.${style}`),
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
  icon: symbolIcon(`connector.pointer.${pointer}`),
}));

const borderStyleOptions: OverlayOptionDefinition[] = (["solid", "dot", "dash", "longDash"] as BorderStyle[]).map(style => ({
  id: style,
  label: style,
  value: style,
  icon: symbolIcon(`stroke.${style}`),
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
    valueSource: { kind: "itemProperty", property: "smartJump" },
    editor: {
      kind: "enum-list",
      options: [
        { id: "on", label: "On", value: true },
        { id: "off", label: "Off", value: false },
      ],
    },
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
    valueSource: { kind: "toolProperty", property: "smartJump" },
    editor: {
      kind: "enum-list",
      options: [
        { id: "on", label: "On", value: true },
        { id: "off", label: "Off", value: false },
      ],
    },
    invoke: { kind: "toolProperty", property: "smartJump" },
  },
];

export const connectorOverlay: ItemOverlayDefinition = {
  itemType: "Connector",
  actions: [
    {
      id: "connector.style",
      label: "Connector style",
      icon: symbolIcon("connector.style"),
      target: "each",
      controls: connectorStyleControls,
      groups: [
        {
          id: "connectorStyle",
          label: "Connector style",
          icon: symbolIcon("connector.style"),
          controlIds: connectorStyleControls.map(control => control.id),
        },
      ],
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
    kind: "symbol",
    key: "tool.connector",
    state: {
      swatch: { kind: "toolProperty", property: "lineColor" },
      note: "UI can tint or swatch the connector icon from the pending line color.",
    },
  },
  defaults: {
    controls: connectorToolControls,
    groups: [
      {
        id: "connectorToolStyle",
        label: "Connector defaults",
        icon: symbolIcon("connector.style"),
        controlIds: connectorToolControls.map(control => control.id),
      },
    ],
  },
};
