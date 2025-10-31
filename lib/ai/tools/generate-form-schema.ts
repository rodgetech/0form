import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";

type GenerateFormSchemaProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

// Define the form field schema with comprehensive validation
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

// Define the complete form schema structure
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

export const generateFormSchema = ({
  session,
  dataStream,
}: GenerateFormSchemaProps) =>
  tool({
    description:
      "Generate a conversational form schema based on the user's natural language description. Creates a structured JSON schema with field definitions, types, validations, and conversational flow. Use this during the ITERATION phase when the user describes their form or requests changes. Do NOT use this when the user approves - use finalizeForm instead.",
    inputSchema: z.object({
      description: z
        .string()
        .describe(
          "The user's natural language description of what data they want to collect (e.g., 'I need customer feedback with name, email, and satisfaction rating 1-5')"
        ),
      additionalContext: z
        .string()
        .optional()
        .describe(
          "Additional context, refinements, or modifications from the conversation (e.g., 'add an NPS question')"
        ),
    }),
    execute: async ({ description, additionalContext }) => {
      let generatedSchema: z.infer<typeof formSchemaOutputSchema> | null = null;

      const systemPrompt = `You are an expert form designer specializing in conversational data collection. Your task is to generate a comprehensive, user-friendly form schema.

**Analysis Guidelines:**
- Carefully analyze the description to identify all fields
- Infer appropriate field types based on context:
  * "email" → email type with validation
  * "rating", "satisfaction", "NPS" → scale type
  * "resume", "CV", "document" → file type
  * "date", "birthday", "when" → date type
  * "comments", "feedback", "description" → longtext type
  * "website", "portfolio" → url type
  * "choose", "select", "which" → choice type
  * Numbers/age/quantity → number type
  * Everything else → text type

**Field Naming:**
- Use snake_case for field names (e.g., "full_name", "email_address", "satisfaction_rating")
- Keep names descriptive but concise

**Labels:**
- Write labels as conversational questions (e.g., "What's your email?" not just "Email")
- Be friendly and clear

**Validation:**
- Always add email pattern validation for email fields
- Add min/max for scale fields (e.g., 1-5, 0-10)
- Suggest reasonable file types for file uploads (e.g., ['.pdf', '.docx'] for resumes)
- Add min/max for number fields when it makes sense

**Scale Fields:**
- For satisfaction ratings: Use 1-5 scale with labels ["Not satisfied", "Very satisfied"]
- For NPS questions: Use 0-10 scale with labels ["Not at all likely", "Extremely likely"]
- For general ratings: Use appropriate scale and labels

**Required Fields:**
- Make contact info (name, email) required by default
- Make core form fields required unless user specifies optional
- Allow flexibility for optional supplementary fields

**Tone Selection:**
- Customer feedback, casual surveys → friendly
- Job applications, business forms → professional
- Event registrations, fun surveys → playful
- Legal forms, official documents → formal

**Field Count:**
- Keep forms concise (5-8 fields ideal)
- Don't add unnecessary fields
- Focus on what the user explicitly requested

Generate a clean, production-ready form schema.`;

      const { fullStream } = streamObject({
        model: myProvider.languageModel("artifact-model"),
        system: systemPrompt,
        prompt: additionalContext
          ? `${description}\n\nAdditional requirements: ${additionalContext}`
          : description,
        schema: formSchemaOutputSchema,
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === "object") {
          const { object } = delta;
          generatedSchema = object as z.infer<typeof formSchemaOutputSchema>;

          // Stream progressive updates to the UI
          dataStream.write({
            type: "data-formSchemaDelta",
            data: object,
            transient: true,
          });
        }
      }

      if (!generatedSchema) {
        return {
          error: "Failed to generate form schema. Please try again.",
        };
      }

      return {
        schema: generatedSchema,
        message: `✅ Form schema generated!\n\n**${generatedSchema.title}**\n${generatedSchema.fields.length} fields created.\n\nWould you like to add, remove, or modify any fields? Or is this ready to finalize?`,
      };
    },
  });
