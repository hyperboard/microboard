import { z } from "zod";
import { ColorValueSchema } from "../../Color/Color.schema";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";
import { RichTextDataSchema } from "../RichText/RichText.schema";

export const StickerDataSchema = z.object({
  itemType: z.literal("Sticker"),
  backgroundColor: ColorValueSchema,
  transformation: TransformationDataSchema,
  text: RichTextDataSchema,
  linkTo: z.string().optional(),
});

export type StickerData = z.infer<typeof StickerDataSchema>;
