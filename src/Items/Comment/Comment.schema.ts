import { z } from 'zod';
import { TransformationDataSchema } from 'Geometry/Transformation/Transformation.schema';

export const CommentatorSchema = z.object({
  username: z.string(),
  id: z.number(),
  avatar: z.string().optional(),
});

export const MessageSchema = z.object({
  date: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  text: z.string(),
  id: z.string(),
  commentator: CommentatorSchema,
  readers: z.array(z.number()),
});

export const CommentDataSchema = z.object({
  itemType: z.literal('Comment'),
  anchor: z.object({
    x: z.number(),
    y: z.number(),
  }),
  thread: z.array(MessageSchema),
  commentators: z.array(CommentatorSchema),
  transformation: TransformationDataSchema,
  usersUnreadMarks: z.array(z.number()),
  resolved: z.boolean(),
  itemToFollow: z.string().optional(),
}).passthrough();
