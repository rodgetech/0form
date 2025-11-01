import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { getFormByChatId, updateForm } from "@/lib/db/queries";

type ToggleFormStatusProps = {
  session: Session;
  chatId: string;
};

export const toggleFormStatus = ({
  session,
  chatId,
}: ToggleFormStatusProps) =>
  tool({
    description:
      "Toggle the form status between published (active) and paused (inactive). Use this when users want to pause, unpublish, republish, or reactivate their form. The tool automatically detects the current status and toggles it to the opposite state. Common user requests: 'pause this form', 'unpublish the form', 'make it live again', 'republish this form', 'turn it back on'.",
    inputSchema: z.object({
      // No parameters needed - operates on the form in the current chat
    }),
    execute: async () => {
      // Fetch the existing form from this chat
      const existingForm = await getFormByChatId({ chatId });

      if (!existingForm) {
        return {
          error:
            "No form found in this chat. Please create a form first before trying to change its status.",
        };
      }

      // Toggle the status
      const currentStatus = existingForm.isActive;
      const newStatus = !currentStatus;

      // Update the form in the database
      const updatedForm = await updateForm({
        id: existingForm.id,
        isActive: newStatus,
      });

      return {
        formId: updatedForm.id,
        previousStatus: currentStatus ? "published" : "paused",
        newStatus: newStatus ? "published" : "paused",
      };
    },
  });
