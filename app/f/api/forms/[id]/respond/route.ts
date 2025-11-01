import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { myProvider } from "@/lib/ai/providers";
import { getFormById } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { postRequestBodySchema } from "./schema";

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const { id: formId } = params;

  // Validate request body
  let requestBody: { message: ChatMessage };

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const { message } = requestBody;

    // Load form from database
    const form = await getFormById({ id: formId });

    // Validate form exists
    if (!form) {
      return new ChatSDKError("not_found:form").toResponse();
    }

    // Validate form is active
    if (!form.isActive) {
      return new ChatSDKError("forbidden:form_inactive").toResponse();
    }

    // TODO: For now, we'll just echo messages back
    // In the next steps, we'll add:
    // - Form filling system prompt
    // - Response collection tools
    // - State management for collected fields
    // - Submission handling

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel("chat-model"),
          system: `You are a friendly assistant helping users fill out a form titled "${form.title}".

Form description: ${form.description || "No description provided"}

Your tone should be: ${form.tone}

For now, just acknowledge their message warmly and let them know you're here to help them fill out the form.`,
          messages: convertToModelMessages([message]),
          stopWhen: stepCountIs(5),
          experimental_activeTools: [],
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {},
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: false,
          })
        );
      },
      generateId: generateUUID,
      onFinish: ({ messages }) => {
        // TODO: Save messages/responses to database
        // This will be implemented in later steps when we add:
        // - FormSubmission tracking
        // - Response collection state
        // - Field mapping logic
        console.log("Form response messages:", messages);
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in form respond API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}
