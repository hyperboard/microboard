import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type PointData = z.infer<typeof PointSchema>;
