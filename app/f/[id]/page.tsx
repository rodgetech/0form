import { notFound } from "next/navigation";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { PublicChat } from "@/components/flowform/public-chat";
import { getFormById } from "@/lib/db/queries";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  // Load form from database
  const form = await getFormById({ id });

  // Handle form not found
  if (!form) {
    notFound();
  }

  // Handle inactive forms
  if (!form.isActive) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <h1 className="font-semibold text-2xl">Form Closed</h1>
          <p className="text-muted-foreground">
            This form is no longer accepting responses. Please contact the form
            creator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Render public chat interface
  return (
    <>
      <PublicChat
        _formSchema={form.schema}
        _formTone={form.tone}
        formDescription={form.description ?? undefined}
        formId={form.id}
        formTitle={form.title}
      />
      <DataStreamHandler />
    </>
  );
}
