import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { getFormByChatId } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type UpdateFormSchemaProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
};

// Reuse the same schemas from generate-form-schema.ts
const formFieldSchema = z.object({
  name: z
    .string()
    .describe(
      "The field name in snake_case (e.g., 'email', 'satisfaction_rating', 'full_name')"
    ),
  type: z
    .enum([
      "text",
      "email",
      "number",
      "date",
      "file",
      "choice",
      "scale",
      "longtext",
      "url",
    ])
    .describe("The field type - determines UI component and validation"),
  label: z
    .string()
    .describe(
      "The human-readable question/label shown to users (e.g., 'What is your email address?')"
    ),
  required: z
    .boolean()
    .describe("Whether this field is required for form submission"),
  validation: z
    .object({
      pattern: z
        .string()
        .optional()
        .describe("Validation pattern name: 'email', 'url', 'phone'"),
      min: z
        .number()
        .optional()
        .describe("Minimum value for numbers or minimum scale value"),
      max: z
        .number()
        .optional()
        .describe("Maximum value for numbers or maximum scale value"),
      acceptedTypes: z
        .array(z.string())
        .optional()
        .describe(
          "Accepted file types for file uploads (e.g., ['.pdf', '.docx', '.jpg'])"
        ),
    })
    .optional()
    .describe("Validation rules for the field"),
  options: z
    .object({
      min: z
        .number()
        .optional()
        .describe("Minimum value for scale fields (e.g., 1 for 1-5 scale)"),
      max: z
        .number()
        .optional()
        .describe("Maximum value for scale fields (e.g., 5 for 1-5 scale)"),
      labels: z
        .array(z.string())
        .optional()
        .describe(
          "Labels for scale endpoints (e.g., ['Not satisfied', 'Very satisfied'])"
        ),
      choices: z
        .array(z.string())
        .optional()
        .describe("Available choices for choice fields (e.g., ['Yes', 'No'])"),
      multiSelect: z
        .boolean()
        .optional()
        .describe("Whether multiple choices can be selected"),
    })
    .optional()
    .describe("Field-specific options for choice and scale fields"),
});

const formSchemaOutputSchema = z.object({
  title: z.string().describe("The form title (e.g., 'Customer Feedback Form')"),
  description: z
    .string()
    .optional()
    .describe("Optional description explaining the form's purpose"),
  fields: z
    .array(formFieldSchema)
    .describe("Array of form fields to collect from users"),
  tone: z
    .enum(["friendly", "professional", "playful", "formal"])
    .default("friendly")
    .describe(
      "Conversational tone: friendly (casual), professional (business), playful (fun), formal (serious)"
    ),
});

// Export types for use in components
export type FormField = z.infer<typeof formFieldSchema>;
export type FormSchema = z.infer<typeof formSchemaOutputSchema>;

export const updateFormSchema = ({
  session,
  dataStream,
  chatId,
}: UpdateFormSchemaProps) =>
  tool({
    description:
      "Update a FINALIZED form schema that has been saved to the database. IMPORTANT: Only use this tool for forms that have been finalized (finalizeForm was called). Do NOT use this during the iteration phase when building a new form - use generateFormSchema with additionalContext instead. This tool fetches the existing form from the database, applies the requested changes, and returns the complete updated schema. After showing the preview, wait for user approval before calling finalizeForm.",
    inputSchema: z.object({
      modificationDescription: z
        .string()
        .describe(
          "The user's description of what changes they want to make (e.g., 'change the tone to professional', 'add a phone number field', 'change rating scale from 1-5 to 1-10')"
        ),
      additionalContext: z
        .string()
        .optional()
        .describe("Additional context or clarifications from the conversation"),
    }),
    execute: async ({ modificationDescription, additionalContext }) => {
      // Fetch the existing form
      const existingForm = await getFormByChatId({ chatId });

      if (!existingForm) {
        return {
          error:
            "No form found in this chat. Please create a form first using generateFormSchema.",
        };
      }

      let updatedSchema: z.infer<typeof formSchemaOutputSchema> | null = null;

      const systemPrompt = `You are updating an existing form schema based on the user's modification request.

**Current Form:**
Title: ${existingForm.title}
Description: ${existingForm.description || "None"}
Tone: ${existingForm.tone}
Schema: ${JSON.stringify(existingForm.schema, null, 2)}

**User's Modification Request:**
${modificationDescription}${additionalContext ? `\n\nAdditional context: ${additionalContext}` : ""}

**Your Task:**
Generate the COMPLETE updated form schema with the requested changes applied.

**Important Guidelines:**
- Apply ONLY the requested changes
- Preserve all unchanged fields exactly as they are
- Maintain the same field order unless the user requests reordering
- If adding fields, place them logically (contact info together, ratings together, etc.)
- If removing fields, ensure the form still makes sense
- If modifying field types, ensure validation rules are updated appropriately
- If changing the tone, keep all other properties the same
- Generate a complete, valid schema ready for preview

**Validation Rules:**
- Email fields must have email pattern validation
- Scale fields must have min/max in options
- Choice fields must have choices array
- File fields should have acceptedTypes
- Required fields must be marked appropriately

Return the complete updated form schema.`;

      const { fullStream } = streamObject({
        model: myProvider.languageModel("artifact-model"),
        system: systemPrompt,
        prompt:
          "Apply the requested changes to generate the complete updated form schema.",
        schema: formSchemaOutputSchema,
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === "object") {
          const { object } = delta;
          updatedSchema = object as z.infer<typeof formSchemaOutputSchema>;

          // Stream progressive updates to the UI
          dataStream.write({
            type: "data-formSchemaDelta",
            data: object,
            transient: true,
          });
        }
      }

      if (!updatedSchema) {
        return {
          error: "Failed to update form schema. Please try again.",
        };
      }

      return {
        schema: updatedSchema,
      };
    },
  });
