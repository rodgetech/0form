import { z } from "zod";

// Schema for creating a new form
export const createFormSchema = z.object({
  chatId: z.string().uuid().describe("The chat ID this form is associated with"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .describe("The form title"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .describe("Optional form description"),
  schema: z
    .record(z.unknown())
    .describe("The form schema as JSON (fields, validations, etc.)"),
  tone: z
    .enum(["friendly", "professional", "playful", "formal"])
    .default("friendly")
    .describe("The conversational tone for the form"),
});

// Schema for updating an existing form
export const updateFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .optional()
    .describe("Updated form title"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .describe("Updated form description"),
  schema: z
    .record(z.unknown())
    .optional()
    .describe("Updated form schema"),
  tone: z
    .enum(["friendly", "professional", "playful", "formal"])
    .optional()
    .describe("Updated conversational tone"),
  isActive: z
    .boolean()
    .optional()
    .describe("Whether the form is active and accepting responses"),
});

// Export TypeScript types
export type CreateFormBody = z.infer<typeof createFormSchema>;
export type UpdateFormBody = z.infer<typeof updateFormSchema>;
