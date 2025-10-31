import { auth } from "@/app/(auth)/auth";
import { deleteForm, getFormById, updateForm } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { updateFormSchema, type UpdateFormBody } from "../schema";

// GET /api/forms/[id] - Get single form by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Form ID is required"
    ).toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const form = await getFormById({ id });

    if (!form) {
      return new ChatSDKError(
        "not_found:api",
        "Form not found"
      ).toResponse();
    }

    if (form.userId !== session.user.id) {
      return new ChatSDKError(
        "forbidden:api",
        "Form belongs to another user"
      ).toResponse();
    }

    return Response.json(form, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Failed to fetch form:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}

// PATCH /api/forms/[id] - Update form
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let requestBody: UpdateFormBody;

  // Step 1: Validate request body
  try {
    const json = await request.json();
    requestBody = updateFormSchema.parse(json);
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
    // Step 3: Verify form exists and user owns it
    const existingForm = await getFormById({ id });

    if (!existingForm) {
      return new ChatSDKError(
        "not_found:api",
        "Form not found"
      ).toResponse();
    }

    if (existingForm.userId !== session.user.id) {
      return new ChatSDKError(
        "forbidden:api",
        "Form belongs to another user"
      ).toResponse();
    }

    // Step 4: Update form
    const updatedForm = await updateForm({
      id,
      ...requestBody,
    });

    return Response.json(updatedForm, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Failed to update form:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}

// DELETE /api/forms/[id] - Delete form
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Form ID is required"
    ).toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const form = await getFormById({ id });

    if (!form) {
      return new ChatSDKError(
        "not_found:api",
        "Form not found"
      ).toResponse();
    }

    if (form.userId !== session.user.id) {
      return new ChatSDKError(
        "forbidden:api",
        "Form belongs to another user"
      ).toResponse();
    }

    const deletedForm = await deleteForm({ id });

    return Response.json(deletedForm, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Failed to delete form:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}
