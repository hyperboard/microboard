import { z } from "zod";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";

export const DimensionSchema = z.object({
  height: z.number(),
  width: z.number(),
});

export const VideoItemDataSchema = z.object({
  itemType: z.literal("Video"),
  url: z.string().optional(),
  videoDimension: DimensionSchema,
  transformation: TransformationDataSchema,
  isStorageUrl: z.boolean(),
  previewUrl: z.string().optional(),
  extension: z.string(),
});

export type VideoItemData = z.infer<typeof VideoItemDataSchema>;
