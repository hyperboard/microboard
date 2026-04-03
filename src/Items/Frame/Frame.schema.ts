import { z } from "zod";
import { ColorValueSchema } from "../../Color/Color.schema";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";
import { RichTextDataSchema } from "../RichText/RichText.schema";

export const FrameDataSchema = z.object({
  itemType: z.literal("Frame"),
  shapeType: z.string(),
  backgroundColor: ColorValueSchema,
  backgroundOpacity: z.number(),
  borderColor: ColorValueSchema,
  borderOpacity: z.number(),
  borderStyle: z.string(),
  borderWidth: z.number(),
  childIds: z.array(z.string()).optional(),
  children: z.array(z.string()).optional(),
  transformation: TransformationDataSchema,
  text: RichTextDataSchema,
  canChangeRatio: z.boolean().optional(),
  linkTo: z.string().optional(),
});

export type FrameData = z.infer<typeof FrameDataSchema>;
