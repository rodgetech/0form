import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { createForm } from "@/lib/db/queries";

type FinalizeFormProps = {
  session: Session;
  chatId: string;
};

export const finalizeForm = ({ session, chatId }: FinalizeFormProps) =>
  tool({
    description:
      "Finalize and save the form to the database after the user has approved the schema. CRITICAL: Only call this when the user explicitly confirms they are ready to save/publish/finalize the form (e.g., 'looks good', 'save it', 'finalize', 'publish', 'that's perfect'). Do NOT call generateFormSchema before calling this - go directly to finalization when user approves.",
    inputSchema: z.object({
      title: z.string().describe("The form title"),
      description: z
        .string()
        .optional()
        .describe("Optional form description"),
      schema: z.record(z.unknown()).describe("The complete form schema object"),
      tone: z
        .enum(["friendly", "professional", "playful", "formal"])
        .describe("The conversational tone"),
    }),
    execute: async ({ title, description, schema, tone }) => {
      // Save form to database
      const form = await createForm({
        chatId,
        userId: session.user.id,
        title,
        description,
        schema,
        tone,
      });

      return {
        formId: form.id,
        message: `✅ Form saved successfully!\n\n**${title}** is now ready to share.\n\nForm ID: ${form.id}`,
      };
    },
  });
