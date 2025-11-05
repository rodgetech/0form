export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Gemini 2.0 Flash",
    description: "Fast and versatile Google AI model with strong tool-calling capabilities",
  },
  // {
  //   id: "chat-model-reasoning",
  //   name: "Grok Reasoning",
  //   description:
  //     "Uses advanced chain-of-thought reasoning for complex problems",
  // },
];
