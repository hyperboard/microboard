import { z } from "zod";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";

export const AudioItemDataSchema = z.object({
  itemType: z.literal("Audio"),
  url: z.string(),
  transformation: TransformationDataSchema,
  extension: z.string().optional(),
});

export type AudioItemData = z.infer<typeof AudioItemDataSchema>;
