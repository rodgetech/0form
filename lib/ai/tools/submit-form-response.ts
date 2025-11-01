import { tool } from "ai";
import { z } from "zod";
import { createFormSubmission } from "@/lib/db/queries";
import type { Form } from "@/lib/db/schema";
import { type FormField, validateFieldType } from "./validation";

type SubmitFormResponseProps = {
  form: Form;
};

export const submitFormResponse = ({ form }: SubmitFormResponseProps) =>
  tool({
    description:
      "Submit the completed form response to the database. Use this tool ONLY after ALL required fields have been collected and validated. This performs final validation and saves the submission permanently.",
    inputSchema: z.object({
      responses: z
        .record(z.string())
        .describe(
          "All collected field responses as key-value pairs (fieldName: value)"
        ),
    }),
    execute: async ({ responses }) => {
      // Parse form schema
      const schema = form.schema as {
        fields: FormField[];
      };

      // Validate all required fields are present
      const missingFields: string[] = [];
      for (const field of schema.fields) {
        if (field.required && !responses[field.name]) {
          missingFields.push(field.label);
        }
      }

      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        };
      }

      // Final validation of all fields
      const validationErrors: string[] = [];
      for (const field of schema.fields) {
        const value = responses[field.name];

        // Skip optional empty fields
        if (!value && !field.required) {
          continue;
        }

        if (value) {
          const validationResult = validateFieldType(field, value, field.label);

          if (!validationResult.valid) {
            validationErrors.push(`${field.label}: ${validationResult.error}`);
          }
        }
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation errors: ${validationErrors.join("; ")}`,
        };
      }

      // Save to database
      try {
        const submission = await createFormSubmission({
          formId: form.id,
          responses,
          metadata: {
            submittedVia: "conversational",
            completedAt: new Date().toISOString(),
          },
        });

        return {
          success: true,
          submissionId: submission.id,
          message: "Your response has been submitted successfully!",
        };
      } catch (_error) {
        return {
          success: false,
          error: "Failed to save submission. Please try again.",
        };
      }
    },
  });
