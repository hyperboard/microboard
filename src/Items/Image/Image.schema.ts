import { z } from "zod";
import { TransformationDataSchema } from "../Transformation/Transformation.schema";

export const DimensionSchema = z.object({
  height: z.number(),
  width: z.number(),
});

export const ImageItemDataSchema = z.object({
  itemType: z.literal("Image"),
  storageLink: z.string(),
  imageDimension: DimensionSchema,
  transformation: TransformationDataSchema,
  linkTo: z.string().optional(),
});

export type ImageItemData = z.infer<typeof ImageItemDataSchema>;
