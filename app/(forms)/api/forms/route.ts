import { auth } from "@/app/(auth)/auth";
import { createForm, getChatById, getFormsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { type CreateFormBody, createFormSchema } from "./schema";

// GET /api/forms - List all forms for authenticated user
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const forms = await getFormsByUserId({ userId: session.user.id });
    return Response.json(forms, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Failed to fetch forms:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}

// POST /api/forms - Create new form
export async function POST(request: Request) {
  let requestBody: CreateFormBody;

  // Step 1: Validate request body
  try {
    const json = await request.json();
    requestBody = createFormSchema.parse(json);
  } catch (_) {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid form data"
    ).toResponse();
  }

  // Step 2: Check authentication
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const { chatId, title, description, schema, tone } = requestBody;

    // Step 3: Verify chat exists and user owns it
    const chat = await getChatById({ id: chatId });

    if (!chat) {
      return new ChatSDKError("not_found:api", "Chat not found").toResponse();
    }

    if (chat.userId !== session.user.id) {
      return new ChatSDKError(
        "forbidden:api",
        "Chat belongs to another user"
      ).toResponse();
    }

    // Step 4: Create form
    const form = await createForm({
      chatId,
      userId: session.user.id,
      title,
      description,
      schema,
      tone,
    });

    return Response.json(form, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Failed to create form:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}
