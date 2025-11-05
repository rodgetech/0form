import { tool } from "ai";
import { z } from "zod";
import type { Form } from "@/lib/db/schema";
import {
  type FormField,
  type ValidationResult,
  validateFieldType,
  validateFile,
} from "./validation";

type CollectFieldResponseProps = {
  form: Form;
};

export const collectFieldResponse = ({ form }: CollectFieldResponseProps) =>
  tool({
    description:
      "Validate a user's response for a specific form field. Use this tool after the user provides an answer to verify it matches the field type and validation rules. This does NOT save to the database - it only validates. Call this for each field as the user provides answers. For file fields, provide the file URL, filename, and MIME type from the uploaded attachment. For multi-select choice fields, provide an array of selected values.",
    inputSchema: z.object({
      fieldName: z
        .string()
        .describe(
          "The name of the field being validated (e.g., 'email', 'phone_number')"
        ),
      fieldValue: z
        .union([z.string(), z.array(z.string())])
        .describe(
          "The user's response value to validate. For file fields, this should be the blob URL. For multi-select choice fields, provide an array of selected values (e.g., ['Red', 'Blue']). For all other fields, provide a string."
        ),
      fileName: z
        .string()
        .optional()
        .describe("For file fields: the name of the uploaded file"),
      mimeType: z
        .string()
        .optional()
        .describe("For file fields: the MIME type of the uploaded file"),
    }),
    execute: ({ fieldName, fieldValue, fileName, mimeType }) => {
      // Parse form schema to find the field
      const schema = form.schema as {
        fields: FormField[];
      };

      const field = schema.fields.find((f) => f.name === fieldName);

      if (!field) {
        return {
          valid: false,
          error: `Field "${fieldName}" not found in form schema`,
        };
      }

      // Handle file fields separately
      let validationResult: ValidationResult;

      if (field.type === "file") {
        // For file fields, use validateFile with file metadata
        if (!fileName || !mimeType) {
          return {
            valid: false,
            fieldName: field.name,
            fieldLabel: field.label,
            error: "Please upload a file",
          };
        }
        const stringValue = Array.isArray(fieldValue)
          ? fieldValue[0]
          : fieldValue;
        validationResult = validateFile(field, stringValue, fileName, mimeType);
      } else {
        // For non-file fields, use regular validation
        validationResult = validateFieldType(field, fieldValue, field.label);
      }

      if (!validationResult.valid) {
        return {
          valid: false,
          fieldName: field.name,
          fieldLabel: field.label,
          error: validationResult.error,
        };
      }

      return {
        valid: true,
        fieldName: field.name,
        fieldLabel: field.label,
        fieldValue: validationResult.parsedValue ?? fieldValue, // Use parsed value if available (e.g., ISO string for dates, blob URL for files)
        parsedValue: validationResult.parsedValue, // Include for AI context
        fileMetadata: validationResult.fileMetadata, // Include file metadata if present
      };
    },
  });
