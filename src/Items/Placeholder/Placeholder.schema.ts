import { z } from "zod";
import { TransformationDataSchema } from "../Transformation/Transformation.schema";

export const PlaceholderDataSchema = z.object({
  itemType: z.literal("Placeholder"),
  backgroundColor: z.string(),
  icon: z.string(),
  transformation: TransformationDataSchema,
  miroData: z.unknown().optional(),
});

export type PlaceholderData = z.infer<typeof PlaceholderDataSchema>;
