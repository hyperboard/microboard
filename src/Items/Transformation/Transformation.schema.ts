import { z } from "zod";

export const TransformationDataSchema = z.object({
  translateX: z.number(),
  translateY: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
  rotate: z.number(),
  isLocked: z.boolean().optional(),
});

export type TransformationData = z.infer<typeof TransformationDataSchema>;
