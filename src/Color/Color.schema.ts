import { z } from "zod";
import { SEMANTIC_COLOR_IDS } from "./ColorValue";

export const ColorValueSchema = z.union([
  z.string(), // Legacy string colors
  z.object({
    type: z.literal("semantic"),
    id: z.enum(SEMANTIC_COLOR_IDS),
  }),
  z.object({
    type: z.literal("fixed"),
    value: z.string(),
  }),
]);

export type ColorValueData = z.infer<typeof ColorValueSchema>;
