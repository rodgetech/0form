import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  getFormByChatId,
  getSubmissionsByFormId,
  saveDocument,
} from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type ViewFormSubmissionsProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
};

type FormField = {
  name: string;
  type: string;
  label: string;
  required: boolean;
};

type FormSchema = {
  fields: FormField[];
};

type FileMetadata = {
  url: string;
  filename: string;
  mimeType: string;
};

type SubmissionResponse = Record<string, string | FileMetadata>;

export const viewFormSubmissions = ({
  session,
  dataStream,
  chatId,
}: ViewFormSubmissionsProps) =>
  tool({
    description:
      "Display form submissions as an interactive spreadsheet. Use when users ask to view, see, or export form responses (e.g., 'show me submissions', 'view responses', 'export data').",
    inputSchema: z.object({}),
    execute: async () => {
      // 1. Get form from this chat
      const form = await getFormByChatId({ chatId });

      if (!form) {
        return {
          error: "No form found in this chat. Create a form first!",
        };
      }

      // 2. Get submissions
      const submissions = await getSubmissionsByFormId({
        formId: form.id,
        limit: 100,
      });

      if (submissions.length === 0) {
        return {
          error:
            "No submissions yet! Share your form to start collecting responses.",
        };
      }

      // 3. Convert to CSV
      const csvContent = formSubmissionsToCSV(
        form as { schema: FormSchema },
        submissions as Array<{
          responses: SubmissionResponse;
          submittedAt: Date;
        }>
      );

      // 4. Create sheet document
      const id = generateUUID();
      const title = `${form.title} - Submissions`;

      // Write metadata to stream
      dataStream.write({ type: "data-kind", data: "sheet", transient: true });
      dataStream.write({ type: "data-id", data: id, transient: true });
      dataStream.write({ type: "data-title", data: title, transient: true });
      dataStream.write({ type: "data-clear", data: null, transient: true });

      // Write CSV content
      dataStream.write({
        type: "data-sheetDelta",
        data: csvContent,
        transient: true,
      });

      // Save to database
      await saveDocument({
        id,
        title,
        content: csvContent,
        kind: "sheet",
        userId: session.user.id,
      });

      // Signal completion
      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind: "sheet",
        count: submissions.length,
        content: `Created spreadsheet with ${submissions.length} submission${submissions.length === 1 ? "" : "s"}.`,
      };
    },
  });

/**
 * Convert form submissions to CSV format
 */
function formSubmissionsToCSV(
  form: { schema: FormSchema },
  submissions: Array<{ responses: SubmissionResponse; submittedAt: Date }>
): string {
  const schema = form.schema;

  // 1. Build header row from field labels
  const headers = [
    ...schema.fields.map((field) => field.label),
    "Submitted At",
  ];

  // 2. Build data rows
  const rows = submissions.map((submission) => {
    const responses = submission.responses;

    return [
      ...schema.fields.map((field) => {
        const value = responses[field.name];

        // Handle empty/missing values
        if (!value) {
          return "";
        }

        // Handle file fields
        if (field.type === "file") {
          if (typeof value === "object" && value !== null) {
            const fileValue = value as FileMetadata;
            if ("filename" in fileValue && fileValue.filename) {
              return `${fileValue.filename}`;
            }
            if ("url" in fileValue && fileValue.url) {
              return fileValue.url;
            }
          }
          return String(value);
        }

        // Handle date fields
        if (field.type === "date") {
          return new Date(String(value)).toLocaleString("en-US", {
            timeZone: "UTC",
          });
        }

        // Text, email, number, scale, choice, etc.
        return String(value);
      }),
      // Add submission timestamp
      new Date(submission.submittedAt).toLocaleString("en-US", {
        timeZone: "UTC",
      }),
    ];
  });

  // 3. Convert to CSV string with proper escaping
  const escapeCsvValue = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];

  return csvLines.join("\n");
}
