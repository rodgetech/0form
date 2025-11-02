import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getFormById } from "@/lib/db/queries";

const FileUploadSchema = z.object({
  file: z.instanceof(Blob).refine((file) => file.size <= 10 * 1024 * 1024, {
    message: "File size should be less than 10MB",
  }),
  formId: z.string().uuid(),
  fieldName: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;
    const formId = formData.get("formId") as string;
    const fieldName = formData.get("fieldName") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate input
    const validated = FileUploadSchema.safeParse({ file, formId, fieldName });

    if (!validated.success) {
      const errorMessage = validated.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Verify form exists and is active (but don't validate field-specific rules)
    const form = await getFormById({ id: formId });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (!form.isActive) {
      return NextResponse.json(
        { error: "Form is not active" },
        { status: 403 }
      );
    }

    // Note: File type validation happens later in collectFieldResponse tool
    // when AI knows which field this file is for

    // Get filename from formData
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      // Upload to Vercel Blob with organized path
      const storagePath = fieldName
        ? `flowform/${formId}/${fieldName}/${Date.now()}-${filename}`
        : `flowform/${formId}/file/${Date.now()}-${filename}`;

      const data = await put(storagePath, fileBuffer, {
        access: "public",
      });

      return NextResponse.json({
        url: data.url,
        filename,
        size: file.size,
        mimeType: file.type,
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
