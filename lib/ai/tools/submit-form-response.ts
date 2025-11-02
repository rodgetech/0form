import { tool } from "ai";
import { z } from "zod";
import { createFormFile, createFormSubmission } from "@/lib/db/queries";
import type { Form } from "@/lib/db/schema";
import { type FormField, validateFieldType, validateFile } from "./validation";

type SubmitFormResponseProps = {
  form: Form;
};

export const submitFormResponse = ({ form }: SubmitFormResponseProps) =>
  tool({
    description:
      "Submit the completed form response to the database. Use this tool ONLY after ALL required fields have been collected and validated. This performs final validation and saves the submission permanently. For file fields, also provide fileMetadata with file details.",
    inputSchema: z.object({
      responses: z
        .record(z.string())
        .describe(
          "All collected field responses as key-value pairs (fieldName: value). For file fields, value should be the blob URL."
        ),
      fileMetadata: z
        .record(
          z.object({
            url: z.string(),
            name: z.string(),
            mimeType: z.string(),
            size: z.string().optional(),
          })
        )
        .optional()
        .describe(
          "File metadata for file fields (fieldName: { url, name, mimeType, size })"
        ),
    }),
    execute: async ({ responses, fileMetadata }) => {
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
          // Handle file fields separately
          if (field.type === "file") {
            const fileMeta = fileMetadata?.[field.name];
            if (!fileMeta) {
              validationErrors.push(
                `${field.label}: Missing file metadata for uploaded file`
              );
              continue;
            }

            const validationResult = validateFile(
              field,
              value,
              fileMeta.name,
              fileMeta.mimeType
            );

            if (!validationResult.valid) {
              validationErrors.push(
                `${field.label}: ${validationResult.error}`
              );
            }
          } else {
            // Regular field validation
            const validationResult = validateFieldType(
              field,
              value,
              field.label
            );

            if (!validationResult.valid) {
              validationErrors.push(
                `${field.label}: ${validationResult.error}`
              );
            }
          }
        }
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation errors: ${validationErrors.join("; ")}`,
        };
      }

      // Transform file field responses to include metadata
      // Instead of storing just URL string, store {url, filename, mimeType} object
      const transformedResponses: Record<
        string,
        string | { url: string; filename: string; mimeType: string }
      > = { ...responses };
      for (const field of schema.fields) {
        if (field.type === "file" && responses[field.name]) {
          const fileMeta = fileMetadata?.[field.name];
          if (fileMeta) {
            transformedResponses[field.name] = {
              url: fileMeta.url,
              filename: fileMeta.name,
              mimeType: fileMeta.mimeType,
            };
          }
        }
      }

      // Save to database
      try {
        const submission = await createFormSubmission({
          formId: form.id,
          responses: transformedResponses,
          metadata: {
            submittedVia: "conversational",
            completedAt: new Date().toISOString(),
          },
        });

        // Create FormFile records for file fields
        if (fileMetadata) {
          const fileCreationPromises: Promise<unknown>[] = [];

          for (const field of schema.fields) {
            if (field.type === "file" && responses[field.name]) {
              const fileMeta = fileMetadata[field.name];
              if (fileMeta) {
                fileCreationPromises.push(
                  createFormFile({
                    submissionId: submission.id,
                    formId: form.id,
                    fieldName: field.name,
                    blobUrl: fileMeta.url,
                    fileName: fileMeta.name,
                    fileSize: fileMeta.size || "0",
                    mimeType: fileMeta.mimeType,
                  })
                );
              }
            }
          }

          // Create all file records in parallel
          if (fileCreationPromises.length > 0) {
            await Promise.all(fileCreationPromises);
          }
        }

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
