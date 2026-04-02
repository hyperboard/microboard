import { z } from "zod";
import { ColorValueSchema } from "../../Color/Color.schema";
import { TransformationDataSchema } from "../Transformation/Transformation.schema";
import { RichTextDataSchema } from "../RichText/RichText.schema";

export const ShapeDataSchema = z.object({
  itemType: z.literal("Shape"),
  shapeType: z.string(),
  backgroundColor: ColorValueSchema,
  backgroundOpacity: z.number(),
  borderColor: ColorValueSchema,
  borderOpacity: z.number(),
  borderStyle: z.string(),
  borderWidth: z.number(),
  transformation: TransformationDataSchema,
  text: RichTextDataSchema,
  linkTo: z.string().optional(),
});

export type ShapeData = z.infer<typeof ShapeDataSchema>;
