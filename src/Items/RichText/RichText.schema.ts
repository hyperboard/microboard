import { z } from "zod";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";

export const TextNodeSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  code: z.boolean().optional(),
  color: z.string().optional(),
  fontSize: z.number().optional(),
});

export const ParagraphNodeSchema = z.object({
  type: z.literal("paragraph"),
  children: z.array(z.lazy(() => DescendantSchema)),
  align: z.enum(["left", "center", "right", "justify"]).optional(),
});

export const CodeBlockNodeSchema = z.object({
  type: z.literal("code_block"),
  children: z.array(z.lazy(() => DescendantSchema)),
});

export const HeadingNodeSchema = z.object({
  type: z.enum(["heading_one", "heading_two", "heading_three", "heading_four", "heading_five"]),
  children: z.array(z.lazy(() => DescendantSchema)),
});

export const BlockQuoteNodeSchema = z.object({
  type: z.literal("block-quote"),
  children: z.array(z.lazy(() => DescendantSchema)),
});

export const ListItemNodeSchema = z.object({
  type: z.literal("list_item"),
  children: z.array(z.lazy(() => DescendantSchema)),
});

export const BulletedListNodeSchema = z.object({
  type: z.literal("ul_list"),
  children: z.array(z.lazy(() => DescendantSchema)),
});

export const NumberedListNodeSchema = z.object({
  type: z.literal("ol_list"),
  children: z.array(z.lazy(() => DescendantSchema)),
});

export const DescendantSchema: z.ZodType<any> = z.union([
  TextNodeSchema,
  ParagraphNodeSchema,
  CodeBlockNodeSchema,
  HeadingNodeSchema,
  BlockQuoteNodeSchema,
  ListItemNodeSchema,
  BulletedListNodeSchema,
  NumberedListNodeSchema,
]);

export const RichTextDataSchema = z.object({
  itemType: z.literal("RichText").optional(),
  children: z.array(DescendantSchema),
  verticalAlignment: z.enum(["top", "center", "bottom"]).optional(),
  maxWidth: z.number().optional(),
  transformation: TransformationDataSchema.optional(),
  containerMaxWidth: z.number().optional(),
  insideOf: z.string().optional(),
  color: z.string().optional(),
  placeholderText: z.string().optional(),
  realSize: z.union([z.literal("auto"), z.number()]).optional(),
  linkTo: z.string().optional(),
});

export type RichTextData = z.infer<typeof RichTextDataSchema>;
