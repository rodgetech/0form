import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { finalizeForm } from "./ai/tools/finalize-form";
import type { generateFormSchema } from "./ai/tools/generate-form-schema";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { toggleFormStatus } from "./ai/tools/toggle-form-status";
import type { updateDocument } from "./ai/tools/update-document";
import type { updateFormSchema } from "./ai/tools/update-form-schema";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type generateFormSchemaTool = InferUITool<
  ReturnType<typeof generateFormSchema>
>;
type updateFormSchemaTool = InferUITool<ReturnType<typeof updateFormSchema>>;
type toggleFormStatusTool = InferUITool<ReturnType<typeof toggleFormStatus>>;
type finalizeFormTool = InferUITool<ReturnType<typeof finalizeForm>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  generateFormSchema: generateFormSchemaTool;
  updateFormSchema: updateFormSchemaTool;
  toggleFormStatus: toggleFormStatusTool;
  finalizeForm: finalizeFormTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  formSchemaDelta: unknown;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
