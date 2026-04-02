import { z } from "zod";
import { TransformationDataSchema } from "../Transformation/Transformation.schema";
import { RichTextDataSchema } from "../RichText/RichText.schema";

export const AINodeDataSchema = z.object({
  itemType: z.literal("AINode"),
  transformation: TransformationDataSchema,
  text: RichTextDataSchema,
  linkTo: z.string().optional(),
  parentNodeId: z.string().optional(),
  isUserRequest: z.boolean(),
  contextItems: z.array(z.string()),
  threadDirection: z.enum(["up", "down", "left", "right"]),
});

export type AINodeData = z.infer<typeof AINodeDataSchema>;
