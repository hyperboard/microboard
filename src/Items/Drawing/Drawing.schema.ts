import { z } from "zod";
import { ColorValueSchema } from "../../Color/Color.schema";
import { TransformationDataSchema } from "../Transformation/Transformation.schema";
import { PointSchema } from "../Point/Point.schema";

export const DrawingDataSchema = z.object({
  itemType: z.literal("Drawing"),
  points: z.array(PointSchema),
  transformation: TransformationDataSchema,
  strokeStyle: ColorValueSchema,
  strokeWidth: z.number(),
  colorRole: z.enum(["foreground", "background"]).optional(),
  linkTo: z.string().optional(),
});

export type DrawingData = z.infer<typeof DrawingDataSchema>;
