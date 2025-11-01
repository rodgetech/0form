import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { createForm, getFormByChatId, updateForm } from "@/lib/db/queries";

type FinalizeFormProps = {
  session: Session;
  chatId: string;
};

export const finalizeForm = ({ session, chatId }: FinalizeFormProps) =>
  tool({
    description:
      "Finalize and save the form to the database after the user has approved the schema. This handles both creating new forms and updating existing ones. CRITICAL: Only call this when the user explicitly confirms they are ready to save/publish/finalize the form (e.g., 'looks good', 'save it', 'finalize', 'publish', 'that's perfect'). Do NOT call generateFormSchema or updateFormSchema before calling this - go directly to finalization when user approves.",
    inputSchema: z.object({
      title: z.string().describe("The form title"),
      description: z.string().optional().describe("Optional form description"),
      schema: z.record(z.unknown()).describe("The complete form schema object"),
      tone: z
        .enum(["friendly", "professional", "playful", "formal"])
        .describe("The conversational tone"),
    }),
    execute: async ({ title, description, schema, tone }) => {
      // Check if a form already exists in this chat
      const existingForm = await getFormByChatId({ chatId });

      if (existingForm) {
        // Update existing form
        const updatedForm = await updateForm({
          id: existingForm.id,
          title,
          description,
          schema,
          tone,
        });

        return {
          formId: updatedForm.id,
        };
      }

      // Create new form
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
      };
    },
  });
