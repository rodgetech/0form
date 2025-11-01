import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
  state: z.enum(["done", "streaming"]).optional(),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

// AI SDK internal part types (step-start, step-finish, tool-call, etc.)
const aiSdkPartSchema = z.object({
  type: z.string(),
}).passthrough();

const partSchema = z.union([textPartSchema, filePartSchema, aiSdkPartSchema]);

const messageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(partSchema),
}).passthrough();

export const postRequestBodySchema = z.object({
  messages: z.array(messageSchema),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
