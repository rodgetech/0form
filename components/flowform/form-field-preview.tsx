import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/lib/ai/tools/generate-form-schema";

type FormFieldPreviewProps = {
  field: FormField;
  value?: unknown;
};

export function FormFieldPreview({ field, value }: FormFieldPreviewProps) {
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
      {renderFieldInput(field, value)}

      {/* Validation hints */}
      {field.validation && (
        <p className="text-muted-foreground text-xs">
          {getValidationHint(field)}
        </p>
      )}
    </div>
  );
}

function renderFieldInput(field: FormField, value?: unknown) {
  switch (field.type) {
    case "text":
    case "email":
    case "url":
    case "number":
      return (
        <Input
          className="bg-muted/50"
          defaultValue={value ? String(value) : undefined}
          disabled
          placeholder={`Enter ${field.label.toLowerCase()}`}
          type={field.type}
        />
      );

    case "date": {
      if (!value) {
        return (
          <div className="flex h-10 items-center rounded-md border border-dashed bg-muted/30 px-3 text-muted-foreground text-sm italic">
            No date selected
          </div>
        );
      }

      const valueString = String(value);
      const hasTime = hasSignificantTime(valueString);

      if (hasTime) {
        // Show date and time in two columns
        return (
          <div className="flex gap-4">
            <div className="flex flex-col gap-3">
              <span className="text-muted-foreground text-xs">Date</span>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
                {formatDateForDisplay(valueString)}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-muted-foreground text-xs">Time</span>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
                {formatTimeForDisplay(valueString)}
              </div>
            </div>
          </div>
        );
      }

      // Show only date (no time component)
      return (
        <div className="flex flex-col gap-3">
          <span className="text-muted-foreground text-xs">Date</span>
          <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
            {formatDateForDisplay(valueString)}
          </div>
        </div>
      );
    }

    case "longtext":
      return (
        <Textarea
          className="min-h-[100px] bg-muted/50"
          defaultValue={value ? String(value) : undefined}
          disabled
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      );

    case "choice": {
      if (!field.options?.choices || field.options.choices.length === 0) {
        return (
          <div className="text-destructive text-sm">
            No choices defined for this field
          </div>
        );
      }

      if (field.options.multiSelect) {
        // Multi-select: Show checkboxes
        const selectedValues = Array.isArray(value) ? (value as string[]) : [];

        return (
          <div className="flex flex-wrap gap-4">
            {field.options.choices.map((choice) => (
              <div className="flex items-center space-x-2" key={choice}>
                <Checkbox
                  checked={selectedValues.includes(choice)}
                  disabled
                  id={`${field.name}-${choice}`}
                />
                <label
                  className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor={`${field.name}-${choice}`}
                >
                  {choice}
                </label>
              </div>
            ))}
          </div>
        );
      }

      // Single select: Show radio buttons
      const selectedValue = typeof value === "string" ? value : "";

      return (
        <RadioGroup disabled value={selectedValue}>
          <div className="flex flex-wrap gap-4">
            {field.options.choices.map((choice) => (
              <div className="flex items-center space-x-2" key={choice}>
                <RadioGroupItem id={`${field.name}-${choice}`} value={choice} />
                <label
                  className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor={`${field.name}-${choice}`}
                >
                  {choice}
                </label>
              </div>
            ))}
          </div>
        </RadioGroup>
      );
    }

    case "scale": {
      const min = field.options?.min ?? 1;
      const max = field.options?.max ?? 5;
      const selectedValue = value ? Number(value) : min;

      return (
        <div className="space-y-4">
          <div className="flex justify-between text-muted-foreground text-sm">
            <span>{field.options?.labels?.[0] || min}</span>
            <span>{field.options?.labels?.[1] || max}</span>
          </div>
          <Slider
            defaultValue={[selectedValue]}
            disabled
            max={max}
            min={min}
            step={1}
          />
          {value ? (
            <p className="text-center font-medium text-sm">
              Selected: {selectedValue}
            </p>
          ) : (
            <p className="text-center text-muted-foreground text-xs">
              Scale: {min} to {max}
            </p>
          )}
        </div>
      );
    }

    case "file":
      if (value) {
        // File value can be either:
        // 1. Object with {url, name, mimeType} OR {url, filename, mimeType} (new format)
        // 2. String URL (legacy format)
        const isFileObject =
          typeof value === "object" &&
          value !== null &&
          "url" in value &&
          ("name" in value || "filename" in value);

        let displayName = "File uploaded";
        if (isFileObject) {
          const fileObj = value as { filename?: string; name?: string };
          displayName = fileObj.filename || fileObj.name || "File uploaded";
        } else if (typeof value === "string") {
          displayName = value;
        }

        return (
          <div className="rounded-md border bg-muted/50 px-3 py-2">
            <p className="text-sm">📎 {displayName}</p>
          </div>
        );
      }
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

function hasSignificantTime(isoString: string): boolean {
  try {
    const date = new Date(isoString);
    // Check if any time component is non-zero
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return hours !== 0 || minutes !== 0 || seconds !== 0;
  } catch {
    return false;
  }
}

function formatDateForDisplay(isoString: string): string {
  try {
    const date = new Date(isoString);
    // Format: "November 2, 2025"
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatTimeForDisplay(isoString: string): string {
  try {
    const date = new Date(isoString);
    // Format: "4:00 PM"
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}
