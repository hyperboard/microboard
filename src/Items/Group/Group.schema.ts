import { z } from "zod";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";

export const GroupDataSchema = z.object({
  itemType: z.literal("Group"),
  childIds: z.array(z.string()).optional(),
  children: z.array(z.string()).optional(),
  transformation: TransformationDataSchema,
  isLockedGroup: z.boolean().optional(),
});

export type GroupData = z.infer<typeof GroupDataSchema>;
