import { tool } from "ai";
import { z } from "zod";
import type { Form } from "@/lib/db/schema";
import type { FormSchema } from "./generate-form-schema";

type PreviewFormResponseProps = {
  form: Form;
};

export const previewFormResponse = ({ form }: PreviewFormResponseProps) =>
  tool({
    description:
      "Show the user a preview of their form responses before final submission. Call this tool after collecting all required fields to display what they entered. The user must then explicitly confirm (say 'submit', 'looks good', 'yes', etc.) before you call submitFormResponse. If the user wants to change something, collect the new value and call this preview tool again.",
    inputSchema: z.object({
      responses: z
        .record(z.unknown())
        .describe(
          "Object mapping field names to their collected values (use the processed values from collectFieldResponse, e.g., ISO strings for dates)"
        ),
    }),
    execute: ({ responses }) => {
      // Parse form schema
      const schema = form.schema as { fields: FormSchema["fields"] };

      // Return schema + responses for the UI to render
      return {
        type: "preview" as const,
        schema: {
          title: form.title,
          description: form.description ?? undefined,
          tone: form.tone,
          fields: schema.fields,
        },
        responses,
      };
    },
  });
