import { z } from "zod";
import { ColorValueSchema } from "../../Color/Color.schema";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";
import { RichTextDataSchema } from "../RichText/RichText.schema";
import { ConnectorLineStyles, ConnectionLineWidths } from "./ConnectorTypes";

export const BoardPointDataSchema = z.object({
  pointType: z.literal("Board"),
  x: z.number(),
  y: z.number(),
});

export const FloatingPointDataSchema = z.object({
  pointType: z.literal("Floating"),
  itemId: z.string(),
  relativeX: z.number(),
  relativeY: z.number(),
});

export const FixedPointDataSchema = z.object({
  pointType: z.literal("Fixed"),
  itemId: z.string(),
  relativeX: z.number(),
  relativeY: z.number(),
});

export const FixedConnectorPointDataSchema = z.object({
  pointType: z.literal("FixedConnector"),
  itemId: z.string(),
  tangent: z.number(),
  segment: z.number(),
});

export const ControlPointDataSchema = z.union([
  BoardPointDataSchema,
  FloatingPointDataSchema,
  FixedPointDataSchema,
  FixedConnectorPointDataSchema,
]);

export const ConnectorDataSchema = z.object({
  itemType: z.literal("Connector"),
  startPoint: ControlPointDataSchema,
  endPoint: ControlPointDataSchema,
  middlePoint: ControlPointDataSchema.nullable().optional(),
  startPointerStyle: z.string(),
  endPointerStyle: z.string(),
  lineStyle: z.enum(ConnectorLineStyles),
  lineColor: ColorValueSchema,
  lineWidth: z.union([z.enum(ConnectionLineWidths.map(String) as any), z.number()]), // Some allow arbitrary numbers or specific ones
  borderStyle: z.string().optional(),
  smartJump: z.boolean().optional(),
  transformation: TransformationDataSchema,
  text: RichTextDataSchema,
  linkTo: z.string().optional(),
});

export type ConnectorData = z.infer<typeof ConnectorDataSchema>;
