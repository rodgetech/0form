import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { getFormByChatId } from "@/lib/db/queries";

type GetFormProps = {
  session: Session;
  chatId: string;
};

export const getForm = ({ session, chatId }: GetFormProps) =>
  tool({
    description:
      "Display the current form in this chat. Use this when users ask to see, preview, or review their form (e.g., 'What does my form look like?', 'Show me the current form', 'Can I preview my form?', 'Display my form'). This is a read-only operation that shows the form without making any changes. If the user wants to make changes, use updateFormSchema instead.",
    inputSchema: z.object({
      // No parameters needed - operates on the form in the current chat
    }),
    execute: async () => {
      // Fetch the form from this chat
      const existingForm = await getFormByChatId({ chatId });

      if (!existingForm) {
        return {
          error:
            "No form found in this chat. You haven't created a form yet. Would you like to create one?",
        };
      }

      // Return the form schema for display
      return {
        schema: existingForm.schema,
        title: existingForm.title,
        description: existingForm.description,
        tone: existingForm.tone,
        isActive: existingForm.isActive,
      };
    },
  });
