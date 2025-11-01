import { tool } from "ai";
import { z } from "zod";
import type { Form } from "@/lib/db/schema";
import { type FormField, validateFieldType } from "./validation";

type CollectFieldResponseProps = {
  form: Form;
};

export const collectFieldResponse = ({ form }: CollectFieldResponseProps) =>
  tool({
    description:
      "Validate a user's response for a specific form field. Use this tool after the user provides an answer to verify it matches the field type and validation rules. This does NOT save to the database - it only validates. Call this for each field as the user provides answers.",
    inputSchema: z.object({
      fieldName: z
        .string()
        .describe(
          "The name of the field being validated (e.g., 'email', 'phone_number')"
        ),
      fieldValue: z.string().describe("The user's response value to validate"),
    }),
    execute: ({ fieldName, fieldValue }) => {
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

      // Validate the field value
      const validationResult = validateFieldType(field, fieldValue, field.label);

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
        fieldValue: validationResult.parsedValue ?? fieldValue, // Use parsed value if available (e.g., ISO string for dates)
        parsedValue: validationResult.parsedValue, // Include for AI context
      };
    },
  });
