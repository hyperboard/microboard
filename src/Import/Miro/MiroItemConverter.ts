import { ItemType } from "../../Items/Item";
import { ColorValue, coerceColorValue } from "../../Color/ColorValue";
import { conf } from "../../Settings";

export interface MiroGeometry {
  width: number;
  height: number;
}

export interface MiroPosition {
  x: number;
  y: number;
  relativeTo: string;
}

export interface MiroStyle {
  fillColor?: string;
  fillOpacity?: string;
  borderColor?: string;
  borderOpacity?: string;
  borderStyle?: string;
  borderWidth?: string;
  color?: string;
  fontSize?: string;
  textAlign?: string;
  textAlignVertical?: string;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWidth?: string;
  startStrokeCap?: string;
  endStrokeCap?: string;
}

export interface MiroItem {
  id: string;
  type: string;
  shape?: string;
  data?: any;
  style?: MiroStyle;
  geometry?: MiroGeometry;
  position?: MiroPosition;
  parent?: { id: string };
  linkTo?: string;
}

const SHAPE_TYPES: Record<string, string> = {
  round_rectangle: "RoundedRectangle",
  circle: "Circle",
  triangle: "Triangle",
  rhombus: "Rhombus",
  wedge_round_rectangle_callout: "SpeachBubble",
  parallelogram: "Parallelogram",
  star: "Star",
  right_arrow: "ArrowRight",
  left_arrow: "ArrowLeft",
  rectangle: "Rectangle",
  left_right_arrow: "ArrowLeftRight",
  pentagon: "Pentagon",
  octagon: "Octagon",
  hexagon: "Hexagon",
  flow_chart_predefined_process: "PredefinedProcess",
  trapezoid: "Trapezoid",
  cloud: "Cloud",
  cross: "Cross",
  can: "Cylinder",
  left_brace: "BracesRight",
  right_brace: "BracesLeft",
};

const BORDER_STYLES: Record<string, string> = {
  normal: "solid",
  dotted: "dot",
  dashed: "dash",
};

const STICKER_COLOR_MAP: Record<string, number> = {
  dark_blue: 2,
  blue: 2,
  light_blue: 3,
  red: 1,
  orange: 6,
  violet: 0,
  pink: 1,
  light_pink: 1,
  cyan: 5,
  dark_green: 4,
  green: 4,
  light_green: 4,
  yellow: 7,
  light_yellow: 7,
  gray: 8,
  black: 9,
};

const FRAME_TYPES: Record<string, string> = {
  custom: "Custom",
  a4: "A4",
  letter: "Letter",
  ratio_16x9: "Frame16x9",
  ratio_4x3: "Frame4x3",
  ratio_1x1: "Frame1x1",
  phone: "Custom",
  tablet: "Custom",
  desktop: "Custom",
};

const CONNECTOR_LINE_STYLES: Record<string, string> = {
  straight: "straight",
  curved: "curved",
  elbowed: "orthogonal",
};

const CONNECTOR_POINTER_STYLES: Record<string, string> = {
  stealth: "ArrowBroad",
  "Arc Arrow": "ArrowThin",
  filled_triangle: "Angle",
  arrow: "ArrowThin",
  triangle: "TriangleEmpty",
  filled_diamond: "DiamondFilled",
  diamond: "DiamondEmpty",
  filled_oval: "CircleFilled",
  oval: "Zero",
  erd_one: "One",
  erd_many: "Many",
  erd_one_or_many: "ManyMandatory",
  erd_only_one: "OneMandatory",
  erd_zero_or_many: "ManyOptional",
  erd_zero_or_one: "OneOptional",
};

export class MiroItemConverter {
  static convert(miroItem: MiroItem): any {
    const { type, style, data, geometry, position, id, linkTo, parent } = miroItem;

    const baseData: any = {
      id,
      parent: parent?.id || "Board",
      linkTo,
    };

    switch (type) {
      case "shape":
        return {
          ...baseData,
          itemType: "Shape",
          shapeType: SHAPE_TYPES[data?.shape] || "Rectangle",
          backgroundColor: MiroItemConverter.convertColor(style?.fillColor, "transparent"),
          backgroundOpacity: style?.fillOpacity ? parseFloat(style.fillOpacity) : 1,
          borderColor: MiroItemConverter.convertColor(style?.borderColor),
          borderOpacity: style?.borderOpacity ? parseFloat(style.borderOpacity) : 1,
          borderStyle: BORDER_STYLES[style?.borderStyle || "normal"] || "solid",
          borderWidth: style?.borderWidth ? parseFloat(style.borderWidth) : 2,
        };

      case "sticky_note":
        const colorIdx = STICKER_COLOR_MAP[style?.fillColor || "yellow"] ?? 7;
        return {
          ...baseData,
          itemType: "Sticker",
          backgroundColor: coerceColorValue(conf.STICKER_COLORS[colorIdx]),
        };

      case "text":
        return {
          ...baseData,
          itemType: "RichText",
        };

      case "frame":
        return {
          ...baseData,
          itemType: "Frame",
          title: data?.title || "Frame",
          frameType: FRAME_TYPES[data?.format] || "Custom",
          backgroundColor: MiroItemConverter.convertColor(style?.fillColor),
        };

      case "connector":
        return {
          ...baseData,
          itemType: "Connector",
          lineColor: MiroItemConverter.convertColor(style?.strokeColor),
          lineStyle: CONNECTOR_LINE_STYLES[miroItem.shape || "straight"] || "straight",
          lineWidth: style?.strokeWidth ? parseFloat(style.strokeWidth) : 1, // Will need mapping to ConnectionLineWidth enum
          startPointerStyle: CONNECTOR_POINTER_STYLES[style?.startStrokeCap || ""] || "None",
          endPointerStyle: CONNECTOR_POINTER_STYLES[style?.endStrokeCap || ""] || "ArrowThin",
        };

      case "image":
        return {
          ...baseData,
          itemType: "Image",
        };

      case "paint":
        return {
          ...baseData,
          itemType: "Drawing",
          strokeColor: MiroItemConverter.convertColor(style?.color),
          strokeWidth: style?.strokeWidth ? parseFloat(style.strokeWidth) : 2,
          strokeOpacity: style?.strokeOpacity ?? 1,
        };

      default:
        return {
          ...baseData,
          itemType: "Placeholder",
        };
    }
  }

  private static convertColor(color: string | undefined, fallback = "black"): ColorValue {
    if (!color) return coerceColorValue(fallback);
    const hex = color === "#ffffff" ? "transparent" : color;
    return coerceColorValue(hex);
  }
}
