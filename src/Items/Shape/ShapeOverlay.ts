import type { BorderStyle } from "Geometry/Path";
import {
  symbolIcon,
  styleFillIcon,
  styleStrokeIcon,
  type ItemOverlayDefinition,
  type OverlayControlDefinition,
  type OverlayOptionDefinition,
  type ToolOverlayDefinition,
} from "Overlay";
import { overlayAssetIcon } from "Overlay";
import { CONTRAST_PALETTE_LIST } from "Color";
import type { ShapeType } from "./ShapeType";

const COLOR_PALETTE = [...CONTRAST_PALETTE_LIST.map((pair) => pair.id), "transparent"];

const inlineShapeAsset = (folder: string, file = folder) =>
  overlayAssetIcon(`src/Items/Shape/Basic/${folder}/${file}.icon.svg`);

const localShapeIcon = (file: string) =>
  overlayAssetIcon(`src/Items/Shape/icons/${file}.icon.svg`);

const shapeSymbolIcon = (key: string) => symbolIcon(key);

const BASIC_INLINE_OPTIONS: OverlayOptionDefinition[] = [
  { id: "rectangle", label: "Rectangle", value: "Rectangle", icon: shapeSymbolIcon("Rectangle"), family: "basicShapes" },
  { id: "rounded-rectangle", label: "Rounded rectangle", value: "RoundedRectangle", icon: shapeSymbolIcon("RoundedRectangle"), family: "basicShapes" },
  { id: "circle", label: "Circle", value: "Circle", icon: shapeSymbolIcon("Circle"), family: "basicShapes" },
  { id: "triangle", label: "Triangle", value: "Triangle", icon: shapeSymbolIcon("Triangle"), family: "basicShapes" },
  { id: "rhombus", label: "Rhombus", value: "Rhombus", icon: shapeSymbolIcon("Rhombus"), family: "basicShapes" },
];

const SHAPE_CATALOG_OPTIONS: OverlayOptionDefinition[] = [
  ...BASIC_INLINE_OPTIONS,
  { id: "arrow-left", label: "Arrow left", value: "ArrowLeft", icon: shapeSymbolIcon("ArrowLeft"), family: "basicShapes" },
  { id: "arrow-right", label: "Arrow right", value: "ArrowRight", icon: shapeSymbolIcon("ArrowRight"), family: "basicShapes" },
  { id: "arrow-left-right", label: "Arrow left right", value: "ArrowLeftRight", icon: shapeSymbolIcon("ArrowLeftRight"), family: "basicShapes" },
  { id: "arrow-block-left", label: "Arrow block left", value: "ArrowBlockLeft", icon: localShapeIcon("ArrowBlockLeft"), family: "basicShapes" },
  { id: "arrow-block-right", label: "Arrow block right", value: "ArrowBlockRight", icon: localShapeIcon("ArrowBlockRight"), family: "basicShapes" },
  { id: "cloud", label: "Cloud", value: "Cloud", icon: shapeSymbolIcon("Cloud"), family: "basicShapes" },
  { id: "cross", label: "Cross", value: "Cross", icon: inlineShapeAsset("Cross"), family: "basicShapes" },
  { id: "cylinder", label: "Cylinder", value: "Cylinder", icon: shapeSymbolIcon("Cylinder"), family: "basicShapes" },
  { id: "hexagon", label: "Hexagon", value: "Hexagon", icon: shapeSymbolIcon("Hexagon"), family: "basicShapes" },
  { id: "octagon", label: "Octagon", value: "Octagon", icon: shapeSymbolIcon("Octagon"), family: "basicShapes" },
  { id: "parallelogram", label: "Parallelogram", value: "Parallelogram", icon: shapeSymbolIcon("Parallelogram"), family: "basicShapes" },
  { id: "predefined-process", label: "Predefined process", value: "PredefinedProcess", icon: shapeSymbolIcon("PredefinedProcess"), family: "basicShapes" },
  { id: "speech-bubble", label: "Speech bubble", value: "SpeachBubble", icon: shapeSymbolIcon("SpeachBubble"), family: "basicShapes" },
  { id: "star", label: "Star", value: "Star", icon: shapeSymbolIcon("Star"), family: "basicShapes" },
  { id: "trapezoid", label: "Trapezoid", value: "Trapezoid", icon: shapeSymbolIcon("Trapezoid"), family: "basicShapes" },
  { id: "braces-left", label: "Braces left", value: "BracesLeft", icon: shapeSymbolIcon("BracesLeft"), family: "basicShapes" },
  { id: "braces-right", label: "Braces right", value: "BracesRight", icon: shapeSymbolIcon("BracesRight"), family: "basicShapes" },
  { id: "bpmn-task", label: "BPMN task", value: "BPMN_Task", icon: shapeSymbolIcon("BPMN_Task"), family: "bpmn" },
  { id: "bpmn-gateway", label: "BPMN gateway", value: "BPMN_Gateway", icon: shapeSymbolIcon("BPMN_Gateway"), family: "bpmn" },
  { id: "bpmn-gateway-parallel", label: "BPMN gateway parallel", value: "BPMN_GatewayParallel", icon: shapeSymbolIcon("BPMN_GatewayParallel"), family: "bpmn" },
  { id: "bpmn-gateway-xor", label: "BPMN gateway XOR", value: "BPMN_GatewayXOR", icon: shapeSymbolIcon("BPMN_GatewayXOR"), family: "bpmn" },
  { id: "bpmn-start-event", label: "BPMN start event", value: "BPMN_StartEvent", icon: shapeSymbolIcon("BPMN_StartEvent"), family: "bpmn" },
  { id: "bpmn-start-event-non-interrupting", label: "BPMN start event non interrupting", value: "BPMN_StartEventNoneInterrupting", icon: shapeSymbolIcon("BPMN_StartEventNoneInterrupting"), family: "bpmn" },
  { id: "bpmn-end-event", label: "BPMN end event", value: "BPMN_EndEvent", icon: shapeSymbolIcon("BPMN_EndEvent"), family: "bpmn" },
  { id: "bpmn-intermediate-event", label: "BPMN intermediate event", value: "BPMN_IntermediateEvent", icon: shapeSymbolIcon("BPMN_IntermediateEvent"), family: "bpmn" },
  { id: "bpmn-intermediate-event-none-interrupting", label: "BPMN intermediate event none interrupting", value: "BPMN_IntermediateEventNoneInterrupting", icon: shapeSymbolIcon("BPMN_IntermediateEventNoneInterrupting"), family: "bpmn" },
  { id: "bpmn-data-object", label: "BPMN data object", value: "BPMN_DataObject", icon: shapeSymbolIcon("BPMN_DataObject"), family: "bpmn" },
  { id: "bpmn-data-store", label: "BPMN data store", value: "BPMN_DataStore", icon: shapeSymbolIcon("BPMN_DataStore"), family: "bpmn" },
  { id: "bpmn-participant", label: "BPMN participant", value: "BPMN_Participant", icon: shapeSymbolIcon("BPMN_Participant"), family: "bpmn" },
  { id: "bpmn-transaction", label: "BPMN transaction", value: "BPMN_Transaction", icon: shapeSymbolIcon("BPMN_Transaction"), family: "bpmn" },
  { id: "bpmn-event-subprocess", label: "BPMN event subprocess", value: "BPMN_EventSubprocess", icon: shapeSymbolIcon("BPMN_EventSubprocess"), family: "bpmn" },
  { id: "bpmn-group", label: "BPMN group", value: "BPMN_Group", icon: shapeSymbolIcon("BPMN_Group"), family: "bpmn" },
  { id: "bpmn-annotation", label: "BPMN annotation", value: "BPMN_Annotation", icon: shapeSymbolIcon("BPMN_Annotation"), family: "bpmn" },
];

const BORDER_STYLE_OPTIONS: OverlayOptionDefinition[] = [
  { id: "solid", label: "Solid", value: "solid", icon: localShapeIcon("StrokeSolid") },
  { id: "dot", label: "Dot", value: "dot", icon: localShapeIcon("StrokeDot") },
  { id: "dash", label: "Dash", value: "dash", icon: localShapeIcon("StrokeDash") },
];

export const shapeTypeControl: OverlayControlDefinition = {
  id: "shapeType",
  label: "Shape type",
  valueSource: { kind: "itemProperty", property: "shapeType" },
  editor: {
    kind: "enum-icon",
    options: BASIC_INLINE_OPTIONS,
    layout: "grid",
    quickOptions: {
      family: "basicShapes",
      maxVisible: 18,
      overflow: "show-more",
    },
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
      icon: localShapeIcon("Type"),
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
  sections: [
    {
      id: "shapeTypeSection",
      label: "Type",
      icon: localShapeIcon("Type"),
      actionIds: ["shape.shapeType"],
    },
    {
      id: "shapeAppearanceSection",
      label: "Appearance",
      icon: localShapeIcon("Stroke"),
      actionIds: ["shape.fill", "shape.strokeStyle"],
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
    ...symbolIcon("Shape"),
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
          layout: "grid",
          quickOptions: {
            family: "basicShapes",
            maxVisible: 18,
            overflow: "show-more",
          },
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
  launch: { kind: "activate-tool" },
  surface: {
    order: 7,
  },
};
