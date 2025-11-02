import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { formFillingPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { collectFieldResponse } from "@/lib/ai/tools/collect-field-response";
import { previewFormResponse } from "@/lib/ai/tools/preview-form-response";
import { submitFormResponse } from "@/lib/ai/tools/submit-form-response";
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
  try {
    const json = await request.json();
    const validatedBody = postRequestBodySchema.parse(json);
    // Type assertion: validated schema matches ChatMessage structure
    const requestBody = validatedBody as { messages: ChatMessage[] };

    return await handleFormResponse(requestBody, formId, request);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

async function handleFormResponse(
  requestBody: { messages: ChatMessage[] },
  formId: string,
  request: Request
) {
  try {
    const { messages: clientMessages } = requestBody;

    // Load form from database
    const form = await getFormById({ id: formId });

    // Validate form exists
    if (!form) {
      return new ChatSDKError("not_found:form").toResponse();
    }

    // Validate form is active
    if (!form.isActive) {
      return new ChatSDKError("forbidden:form").toResponse();
    }

    // Parse form schema for the prompt
    const schema = form.schema as {
      fields: Array<{
        name: string;
        type: string;
        label: string;
        required: boolean;
        options?: Record<string, unknown>;
      }>;
    };

    // Extract file metadata from messages and filter out file parts
    // The AI model doesn't need the actual file content, only metadata for validation
    const fileMetadata: Array<{
      url: string;
      filename: string;
      mimeType: string;
    }> = [];

    const messagesWithoutFiles = clientMessages.map((message) => {
      if (message.role === "user" && message.parts) {
        const filteredParts = message.parts.filter((part) => {
          if (part.type === "file") {
            // Extract metadata before filtering
            // Type assertion: we know it's a file part, so it has url and mediaType
            const filePart = part as {
              url: string;
              mediaType: string;
              name?: string;
              filename?: string;
            };
            fileMetadata.push({
              url: filePart.url,
              filename: filePart.name || filePart.filename || "unknown",
              mimeType: filePart.mediaType,
            });
            return false; // Remove file part
          }
          return true; // Keep non-file parts
        });

        return { ...message, parts: filteredParts };
      }
      return message;
    });

    // Build file metadata context for system prompt
    const fileContext =
      fileMetadata.length > 0
        ? `\n\n**File Uploads Context:**\nThe user has uploaded the following files. Extract this information to pass to the collectFieldResponse tool:\n${fileMetadata.map((file) => `- URL: ${file.url}\n  Filename: ${file.filename}\n  MIME Type: ${file.mimeType}`).join("\n")}\n`
        : "";

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel("chat-model"),
          system:
            formFillingPrompt({
              title: form.title,
              description: form.description ?? undefined,
              fields: schema.fields,
              tone: form.tone,
            }) + fileContext,
          messages: convertToModelMessages(messagesWithoutFiles),
          stopWhen: stepCountIs(10),
          experimental_activeTools: [
            "collectFieldResponse",
            "previewFormResponse",
            "submitFormResponse",
          ],
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            collectFieldResponse: collectFieldResponse({ form }),
            previewFormResponse: previewFormResponse({ form }),
            submitFormResponse: submitFormResponse({ form }),
          },
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
        // Form submissions are handled by the submitFormResponse tool
        // No additional processing needed here
        console.log(
          "Form conversation completed:",
          messages.length,
          "messages"
        );
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
