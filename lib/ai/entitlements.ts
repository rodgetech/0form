import type { UserType } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";
import type { ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  maxForms: number;
  availableChatModelIds: ChatModel["id"][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    maxForms: 1,
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },

  /*
   * For users with an account
   * In development: unlimited messages and forms for easier testing
   * In production: limits enforced
   */
  regular: {
    maxMessagesPerDay: isDevelopmentEnvironment ? Number.MAX_SAFE_INTEGER : 100,
    maxForms: isDevelopmentEnvironment ? Number.MAX_SAFE_INTEGER : 3,
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
