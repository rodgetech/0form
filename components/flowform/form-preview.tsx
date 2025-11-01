import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { FormSchema } from "@/lib/ai/tools/generate-form-schema";
import { FormFieldPreview } from "./form-field-preview";

type FormPreviewProps = {
  schema: FormSchema;
};

export function FormPreview({ schema }: FormPreviewProps) {
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="space-y-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{schema.title}</h3>
          {schema.description && (
            <p className="text-muted-foreground text-sm">
              {schema.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className="capitalize" variant="secondary">
            {schema.tone}
          </Badge>
          <Badge variant="outline">
            {schema.fields.length}{" "}
            {schema.fields.length === 1 ? "field" : "fields"}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <div className="space-y-6">
          {schema.fields.map((field) => (
            <FormFieldPreview field={field} key={field.name} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
