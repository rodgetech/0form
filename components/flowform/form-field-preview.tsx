import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/lib/ai/tools/generate-form-schema";

type FormFieldPreviewProps = {
  field: FormField;
};

export function FormFieldPreview({ field }: FormFieldPreviewProps) {
  return (
    <div className="space-y-2">
      {/* Label with required indicator and type badge */}
      <div className="flex flex-wrap items-center gap-2">
        <Label className="font-medium text-sm">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <Badge className="text-xs uppercase" variant="outline">
          {field.type}
        </Badge>
      </div>

      {/* Render appropriate input based on field type */}
      {renderFieldInput(field)}

      {/* Validation hints */}
      {field.validation && (
        <p className="text-muted-foreground text-xs">
          {getValidationHint(field)}
        </p>
      )}
    </div>
  );
}

function renderFieldInput(field: FormField) {
  switch (field.type) {
    case "text":
    case "email":
    case "url":
    case "number":
      return (
        <Input
          className="bg-muted/50"
          disabled
          placeholder={`Enter ${field.label.toLowerCase()}`}
          type={field.type}
        />
      );

    case "date":
      return <Input className="bg-muted/50" disabled type="date" />;

    case "longtext":
      return (
        <Textarea
          className="min-h-[100px] bg-muted/50"
          disabled
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      );

    case "choice":
      if (!field.options?.choices || field.options.choices.length === 0) {
        return (
          <div className="text-destructive text-sm">
            No choices defined for this field
          </div>
        );
      }

      if (field.options.multiSelect) {
        // For multi-select, show a simple note
        return (
          <Select disabled>
            <SelectTrigger className="bg-muted/50">
              <SelectValue placeholder="Select options (multiple selections allowed)" />
            </SelectTrigger>
            <SelectContent>
              {field.options.choices.map((choice) => (
                <SelectItem key={choice} value={choice}>
                  {choice}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      return (
        <Select disabled>
          <SelectTrigger className="bg-muted/50">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {field.options.choices.map((choice) => (
              <SelectItem key={choice} value={choice}>
                {choice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "scale":
      return (
        <div className="space-y-2">
          <div className="flex justify-between text-muted-foreground text-sm">
            <span>
              {field.options?.labels?.[0] || field.options?.min || "1"}
            </span>
            <span>
              {field.options?.labels?.[1] || field.options?.max || "5"}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-0 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/40" />
          </div>
          {field.options?.min !== undefined &&
            field.options?.max !== undefined && (
              <p className="text-center text-muted-foreground text-xs">
                Scale: {field.options.min} to {field.options.max}
              </p>
            )}
        </div>
      );

    case "file":
      return (
        <div className="rounded-lg border-2 border-dashed bg-muted/20 p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Click to upload or drag and drop
          </p>
          {field.validation?.acceptedTypes &&
            field.validation.acceptedTypes.length > 0 && (
              <p className="mt-1 text-muted-foreground text-xs">
                Accepted: {field.validation.acceptedTypes.join(", ")}
              </p>
            )}
        </div>
      );

    default:
      return (
        <div className="text-muted-foreground text-sm">
          Unknown field type: {field.type}
        </div>
      );
  }
}

function getValidationHint(field: FormField): string {
  const hints: string[] = [];

  if (field.validation?.pattern) {
    hints.push(`Format: ${field.validation.pattern}`);
  }

  if (
    field.validation?.min !== undefined &&
    field.validation?.max !== undefined
  ) {
    hints.push(`Range: ${field.validation.min} - ${field.validation.max}`);
  } else if (field.validation?.min !== undefined) {
    hints.push(`Minimum: ${field.validation.min}`);
  } else if (field.validation?.max !== undefined) {
    hints.push(`Maximum: ${field.validation.max}`);
  }

  return hints.join(" • ");
}
