"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import { Messages } from "@/components/messages";
import { MultimodalInput } from "@/components/multimodal-input";
import { toast } from "@/components/toast";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage } from "@/lib/types";
import { fetchWithErrorHandlers, generateUUID } from "@/lib/utils";

export function PublicChat({
  formId,
  formTitle,
  formDescription,
  _formSchema,
  _formTone,
}: {
  formId: string;
  formTitle: string;
  formDescription?: string;
  _formSchema: unknown;
  _formTone: string;
}) {
  // TODO: formSchema and formTone will be used in Step 2 for conversation engine
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);

  const { messages, setMessages, sendMessage, status, stop, regenerate } =
    useChat<ChatMessage>({
      id: formId,
      messages: [],
      experimental_throttle: 100,
      generateId: generateUUID,
      transport: new DefaultChatTransport({
        api: `/api/forms/${formId}/respond`,
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest(request) {
          return {
            body: {
              messages: request.messages,
              ...request.body,
            },
          };
        },
      }),
      onData: (dataPart) => {
        setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      },
      onFinish: () => {
        // No history mutation needed for public forms
      },
      onError: (error) => {
        if (error instanceof ChatSDKError) {
          // Check if it's a credit card error
          if (
            error.message?.includes("AI Gateway requires a valid credit card")
          ) {
            setShowCreditCardAlert(true);
          } else {
            toast({
              type: "error",
              description: error.message,
            });
          }
        }
      },
    });

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Auto-send initial greeting message on form load
  useEffect(() => {
    if (!hasInitialized && messages.length === 0) {
      // Send a minimal trigger message to start the conversation
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: "Hi" }],
      });
      setHasInitialized(true);
    }
  }, [hasInitialized, messages.length, sendMessage]);

  return (
    <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
      {/* Form Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <h1 className="font-semibold text-xl">{formTitle}</h1>
          {formDescription && (
            <p className="mt-1 text-muted-foreground text-sm">
              {formDescription}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <Messages
        chatId={formId}
        isArtifactVisible={false}
        isReadonly={false}
        messages={messages}
        regenerate={regenerate}
        selectedModelId="chat-model"
        setMessages={setMessages}
        status={status}
        votes={[]}
      />

      {/* Input */}
      <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
        <MultimodalInput
          attachments={attachments}
          chatId={formId}
          enableUrlNavigation={false}
          input={input}
          messages={messages}
          onModelChange={() => {
            // Model is fixed for public forms
          }}
          selectedModelId="chat-model"
          selectedVisibilityType="public"
          sendMessage={sendMessage}
          setAttachments={setAttachments}
          setInput={setInput}
          setMessages={setMessages}
          status={status}
          stop={stop}
          usage={undefined}
        />
      </div>

      {/* Credit Card Alert (if needed) */}
      {showCreditCardAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-lg bg-background p-6">
            <h2 className="mb-2 font-semibold text-lg">Credit Card Required</h2>
            <p className="mb-4 text-muted-foreground text-sm">
              AI Gateway requires a valid credit card on file. Please contact
              the form creator.
            </p>
            <button
              className="rounded bg-primary px-4 py-2 text-primary-foreground text-sm"
              onClick={() => setShowCreditCardAlert(false)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
