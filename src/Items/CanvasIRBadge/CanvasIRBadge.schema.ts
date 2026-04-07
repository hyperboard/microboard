import { z } from "zod";
import type { BaseItemData } from "Items/BaseItem/BaseItem";
import type { TransformationData } from "Geometry/Transformation/TransformationData";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";

export const CanvasIRBadgeDataSchema = z.object({
  itemType: z.literal("CanvasIRBadge"),
  width: z.number().positive(),
  height: z.number().positive(),
  backgroundColor: z.string(),
  borderColor: z.string(),
  borderWidth: z.number().positive(),
  transformation: TransformationDataSchema,
  linkTo: z.string().optional(),
});

export interface CanvasIRBadgeData extends BaseItemData {
  readonly itemType: "CanvasIRBadge";
  width: number;
  height: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  transformation: TransformationData;
  linkTo?: string;
}
