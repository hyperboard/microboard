import type { BorderStyle } from "Geometry/Path";
import {
  styleFillIcon,
  styleStrokeIcon,
  type ItemOverlayDefinition,
  type OverlayControlDefinition,
  type OverlayOptionDefinition,
  type ToolOverlayDefinition,
} from "Overlay";
import type { ShapeType } from "./ShapeType";

const COLOR_PALETTE = [
  "#111111",
  "#FFFFFF",
  "#FF6B6B",
  "#FFD166",
  "#06D6A0",
  "#118AB2",
  "#7B61FF",
  "transparent",
];

const inlineShapeAsset = (folder: string, file = folder) => ({
  kind: "asset" as const,
  path: `src/Items/Shape/Basic/${folder}/${file}.icon.svg`,
  mimeType: "image/svg+xml" as const,
});

const symbolIcon = (key: string) => ({ kind: "symbol" as const, key });

const BASIC_INLINE_OPTIONS: OverlayOptionDefinition[] = [
  { id: "rectangle", label: "Rectangle", value: "Rectangle", icon: inlineShapeAsset("Rectangle") },
  { id: "rounded-rectangle", label: "Rounded rectangle", value: "RoundedRectangle", icon: inlineShapeAsset("RoundedRectangle") },
  { id: "circle", label: "Circle", value: "Circle", icon: inlineShapeAsset("Circle") },
  { id: "triangle", label: "Triangle", value: "Triangle", icon: inlineShapeAsset("Triangle") },
  { id: "rhombus", label: "Rhombus", value: "Rhombus", icon: inlineShapeAsset("Rhombus") },
];

const SHAPE_CATALOG_OPTIONS: OverlayOptionDefinition[] = [
  ...BASIC_INLINE_OPTIONS,
  { id: "reversed-triangle", label: "Reversed triangle", value: "ReversedTriangle", icon: symbolIcon("shape.reversedTriangle") },
  { id: "arrow-left", label: "Arrow left", value: "ArrowLeft", icon: inlineShapeAsset("ArrowLeft") },
  { id: "arrow-right", label: "Arrow right", value: "ArrowRight", icon: inlineShapeAsset("ArrowRight") },
  { id: "arrow-left-right", label: "Arrow left right", value: "ArrowLeftRight", icon: inlineShapeAsset("ArrowLeftRight") },
  { id: "arrow-block-left", label: "Arrow block left", value: "ArrowBlockLeft", icon: symbolIcon("shape.arrowBlockLeft") },
  { id: "arrow-block-right", label: "Arrow block right", value: "ArrowBlockRight", icon: symbolIcon("shape.arrowBlockRight") },
  { id: "cloud", label: "Cloud", value: "Cloud", icon: inlineShapeAsset("Cloud") },
  { id: "cross", label: "Cross", value: "Cross", icon: inlineShapeAsset("Cross") },
  { id: "cylinder", label: "Cylinder", value: "Cylinder", icon: inlineShapeAsset("Cylinder") },
  { id: "hexagon", label: "Hexagon", value: "Hexagon", icon: inlineShapeAsset("Hexagon") },
  { id: "octagon", label: "Octagon", value: "Octagon", icon: inlineShapeAsset("Octagon") },
  { id: "parallelogram", label: "Parallelogram", value: "Parallelogram", icon: inlineShapeAsset("Parallelogram") },
  { id: "reversed-parallelogram", label: "Reversed parallelogram", value: "ReversedParallelogram", icon: symbolIcon("shape.reversedParallelogram") },
  { id: "pentagon", label: "Pentagon", value: "Pentagon", icon: inlineShapeAsset("Pentagon") },
  { id: "predefined-process", label: "Predefined process", value: "PredefinedProcess", icon: symbolIcon("shape.predefinedProcess") },
  { id: "speech-bubble", label: "Speech bubble", value: "SpeachBubble", icon: inlineShapeAsset("SpeachBubble") },
  { id: "star", label: "Star", value: "Star", icon: inlineShapeAsset("Star") },
  { id: "trapezoid", label: "Trapezoid", value: "Trapezoid", icon: inlineShapeAsset("Trapezoid") },
  { id: "braces-left", label: "Braces left", value: "BracesLeft", icon: inlineShapeAsset("BracesLeft", "BracesLeft") },
  { id: "braces-right", label: "Braces right", value: "BracesRight", icon: inlineShapeAsset("BracesRight", "BracesRight") },
  { id: "bpmn-task", label: "BPMN task", value: "BPMN_Task", icon: symbolIcon("shape.bpmn.task") },
  { id: "bpmn-gateway", label: "BPMN gateway", value: "BPMN_Gateway", icon: symbolIcon("shape.bpmn.gateway") },
  { id: "bpmn-gateway-parallel", label: "BPMN gateway parallel", value: "BPMN_GatewayParallel", icon: symbolIcon("shape.bpmn.gatewayParallel") },
  { id: "bpmn-gateway-xor", label: "BPMN gateway XOR", value: "BPMN_GatewayXOR", icon: symbolIcon("shape.bpmn.gatewayXor") },
  { id: "bpmn-start-event", label: "BPMN start event", value: "BPMN_StartEvent", icon: symbolIcon("shape.bpmn.startEvent") },
  { id: "bpmn-start-event-non-interrupting", label: "BPMN start event non interrupting", value: "BPMN_StartEventNoneInterrupting", icon: symbolIcon("shape.bpmn.startEventNoneInterrupting") },
  { id: "bpmn-end-event", label: "BPMN end event", value: "BPMN_EndEvent", icon: symbolIcon("shape.bpmn.endEvent") },
  { id: "bpmn-intermediate-event", label: "BPMN intermediate event", value: "BPMN_IntermediateEvent", icon: symbolIcon("shape.bpmn.intermediateEvent") },
  { id: "bpmn-intermediate-event-none-interrupting", label: "BPMN intermediate event none interrupting", value: "BPMN_IntermediateEventNoneInterrupting", icon: symbolIcon("shape.bpmn.intermediateEventNoneInterrupting") },
  { id: "bpmn-data-object", label: "BPMN data object", value: "BPMN_DataObject", icon: symbolIcon("shape.bpmn.dataObject") },
  { id: "bpmn-data-store", label: "BPMN data store", value: "BPMN_DataStore", icon: symbolIcon("shape.bpmn.dataStore") },
  { id: "bpmn-participant", label: "BPMN participant", value: "BPMN_Participant", icon: symbolIcon("shape.bpmn.participant") },
  { id: "bpmn-transaction", label: "BPMN transaction", value: "BPMN_Transaction", icon: symbolIcon("shape.bpmn.transaction") },
  { id: "bpmn-event-subprocess", label: "BPMN event subprocess", value: "BPMN_EventSubprocess", icon: symbolIcon("shape.bpmn.eventSubprocess") },
  { id: "bpmn-group", label: "BPMN group", value: "BPMN_Group", icon: symbolIcon("shape.bpmn.group") },
  { id: "bpmn-annotation", label: "BPMN annotation", value: "BPMN_Annotation", icon: symbolIcon("shape.bpmn.annotation") },
];

const BORDER_STYLE_OPTIONS: OverlayOptionDefinition[] = [
  { id: "solid", label: "Solid", value: "solid", icon: symbolIcon("stroke.solid") },
  { id: "dot", label: "Dot", value: "dot", icon: symbolIcon("stroke.dot") },
  { id: "dash", label: "Dash", value: "dash", icon: symbolIcon("stroke.dash") },
  { id: "long-dash", label: "Long dash", value: "longDash", icon: symbolIcon("stroke.longDash") },
];

export const shapeTypeControl: OverlayControlDefinition = {
  id: "shapeType",
  label: "Shape type",
  valueSource: { kind: "itemProperty", property: "shapeType" },
  editor: {
    kind: "enum-icon",
    options: BASIC_INLINE_OPTIONS,
    catalog: {
      kind: "catalog",
      label: "Shape catalog",
      family: "shape",
      options: SHAPE_CATALOG_OPTIONS,
      description: "Small inline set plus large catalog for the full shape space.",
    },
  },
  invoke: { kind: "setProperty", property: "shapeType" },
};

const fillControl: OverlayControlDefinition = {
  id: "backgroundColor",
  label: "Fill",
  valueSource: { kind: "itemProperty", property: "backgroundColor" },
  icon: styleFillIcon({
    swatch: { kind: "itemProperty", property: "backgroundColor" },
    note: "UI can render the current fill color as a swatch inside the icon.",
  }),
  editor: {
    kind: "color",
    palette: COLOR_PALETTE,
    allowTransparent: true,
  },
  invoke: { kind: "setProperty", property: "backgroundColor" },
};

const strokeControls: OverlayControlDefinition[] = [
  {
    id: "borderColor",
    label: "Stroke color",
    valueSource: { kind: "itemProperty", property: "borderColor" },
    editor: {
      kind: "color",
      palette: COLOR_PALETTE,
      allowTransparent: true,
    },
    invoke: { kind: "setProperty", property: "borderColor" },
  },
  {
    id: "borderWidth",
    label: "Stroke width",
    valueSource: { kind: "itemProperty", property: "borderWidth" },
    editor: {
      kind: "number-stepper",
      min: 0,
      max: 12,
      step: 1,
      presets: [0, 1, 2, 4, 8],
      unit: "px",
    },
    invoke: { kind: "setProperty", property: "borderWidth" },
  },
  {
    id: "borderStyle",
    label: "Stroke pattern",
    valueSource: { kind: "itemProperty", property: "borderStyle" },
    editor: {
      kind: "enum-list",
      options: BORDER_STYLE_OPTIONS,
    },
    invoke: { kind: "setProperty", property: "borderStyle" },
  },
];

export const shapeOverlay: ItemOverlayDefinition = {
  itemType: "Shape",
  actions: [
    {
      id: "shape.shapeType",
      label: "Shape type",
      icon: symbolIcon("shape.type"),
      target: "each",
      controls: [shapeTypeControl],
    },
    {
      id: "shape.fill",
      label: "Fill",
      icon: fillControl.icon,
      target: "each",
      controls: [fillControl],
    },
    {
      id: "shape.strokeStyle",
      label: "Stroke style",
      icon: styleStrokeIcon(),
      target: "each",
      controls: strokeControls,
      groups: [
        {
          id: "shapeStrokeStyle",
          label: "Stroke style",
          icon: styleStrokeIcon(),
          controlIds: strokeControls.map(control => control.id),
        },
      ],
    },
  ],
};

export const addShapeToolOverlay: ToolOverlayDefinition = {
  toolName: "AddShape",
  label: "Shape",
  kind: "create",
  createsItemType: "Shape",
  family: "shape",
  icon: {
    kind: "symbol",
    key: "tool.shape",
    state: {
      note: "UI may swap the top-level icon to the selected shape option when desired.",
    },
  },
  defaults: {
    controls: [
      {
        id: "toolShapeType",
        label: "Shape",
        valueSource: { kind: "toolProperty", property: "type" },
        editor: {
          kind: "enum-icon",
          options: BASIC_INLINE_OPTIONS,
          catalog: {
            kind: "catalog",
            label: "Shape catalog",
            family: "shape",
            options: SHAPE_CATALOG_OPTIONS,
          },
        },
        invoke: { kind: "toolProperty", property: "type" },
      },
    ],
  },
};
