/**
 * Validation utilities for form field responses
 * Used by collect-field-response and submit-form-response tools
 */

import { parseDate } from "chrono-node";

export type ValidationResult = {
  valid: boolean;
  error?: string;
  parsedValue?: string; // For date fields, returns ISO string; for files, returns blob URL
  fileMetadata?: {
    url: string;
    name: string;
    mimeType: string;
  };
};

export type FormField = {
  name: string;
  type:
    | "text"
    | "email"
    | "number"
    | "date"
    | "file"
    | "choice"
    | "scale"
    | "longtext"
    | "url";
  label: string;
  required: boolean;
  validation?: {
    pattern?: "email" | "url" | "phone";
    min?: number;
    max?: number;
    acceptedTypes?: string[];
  };
  options?: {
    min?: number;
    max?: number;
    labels?: string[];
    choices?: string[];
    multiSelect?: boolean;
  };
};

// Regex constants for validation (moved to top level for performance)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s()-]{10,}$/;

// Time detection regex patterns (moved to top level for performance)
const TIME_PATTERNS = [
  /\d{1,2}:\d{2}/, // 3:30, 14:00
  /\d{1,2}\s*(am|pm)/i, // 3pm, 4 PM
  /\bat\s+\d/i, // "at 3", "at 14"
  /(noon|midnight|morning|afternoon|evening|night)/i,
];

/**
 * Validate email format
 */
export function validateEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

/**
 * Validate URL format
 */
export function validateUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number (basic US format)
 */
export function validatePhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}

/**
 * Validate number and optional range
 */
export function validateNumber(
  value: string,
  min?: number,
  max?: number
): ValidationResult {
  const num = Number.parseFloat(value);

  if (Number.isNaN(num)) {
    return { valid: false, error: "Please provide a valid number" };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `Number must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `Number must be at most ${max}` };
  }

  return { valid: true };
}

/**
 * Detect if user input includes a time component
 * Checks for time-related keywords and patterns
 */
function hasTimeComponent(value: string): boolean {
  const lowerValue = value.toLowerCase().trim();

  return TIME_PATTERNS.some((pattern) => pattern.test(lowerValue));
}

/**
 * Detect if a field label suggests time is required
 */
function labelRequiresTime(label: string): boolean {
  const lowerLabel = label.toLowerCase();

  return (
    lowerLabel.includes("time") ||
    lowerLabel.includes("when") ||
    lowerLabel.includes("schedule") ||
    lowerLabel.includes("appointment") ||
    lowerLabel.includes("booking")
  );
}

/**
 * Validate date format using natural language parsing
 * Supports formats like "tomorrow at 3pm", "January 1st, 2026", "next Tuesday"
 */
export function validateDate(
  value: string,
  fieldLabel?: string
): ValidationResult {
  if (!value || value.trim() === "") {
    return { valid: false, error: "Please provide a date" };
  }

  // Parse natural language date using chrono-node
  const parsed = parseDate(value);

  if (!parsed) {
    return {
      valid: false,
      error:
        "I couldn't understand that date. Could you try a format like 'January 15, 2026', 'tomorrow at 3pm', or 'next Tuesday'?",
    };
  }

  // Check if time component is required but missing
  const userProvidedTime = hasTimeComponent(value);
  const timeIsRequired = fieldLabel && labelRequiresTime(fieldLabel);

  if (timeIsRequired && !userProvidedTime) {
    return {
      valid: false,
      error:
        "Please include a specific time (e.g., 'tomorrow at 3pm' or 'January 15 at 2:30pm')",
    };
  }

  // Return the parsed date as ISO string for storage
  return {
    valid: true,
    parsedValue: parsed.toISOString(),
  };
}

/**
 * Validate required field (non-empty)
 */
export function validateRequired(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Validate choice field (must match one of the options)
 */
export function validateChoice(
  value: string,
  choices: string[]
): ValidationResult {
  const normalized = value.toLowerCase().trim();
  const matchesChoice = choices.some(
    (choice) => choice.toLowerCase().trim() === normalized
  );

  if (!matchesChoice) {
    return {
      valid: false,
      error: `Please choose one of: ${choices.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate multi-choice field (must match multiple options from the list)
 */
export function validateMultiChoice(
  values: string[],
  choices: string[]
): ValidationResult {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      valid: false,
      error: `Please select at least one option from: ${choices.join(", ")}`,
    };
  }

  const invalidChoices: string[] = [];
  for (const value of values) {
    const normalized = value.toLowerCase().trim();
    const isValid = choices.some(
      (choice) => choice.toLowerCase().trim() === normalized
    );
    if (!isValid) {
      invalidChoices.push(value);
    }
  }

  if (invalidChoices.length > 0) {
    return {
      valid: false,
      error: `Invalid choices: ${invalidChoices.join(", ")}. Please choose from: ${choices.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate scale field (must be within range)
 */
export function validateScale(
  value: string,
  min: number,
  max: number
): ValidationResult {
  const num = Number.parseInt(value, 10);

  if (Number.isNaN(num)) {
    return { valid: false, error: "Please provide a number" };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: `Please choose a number between ${min} and ${max}`,
    };
  }

  return { valid: true };
}

/**
 * Main field validation function
 * Validates a field value based on its type and validation rules
 */
export function validateFieldType(
  field: FormField,
  value: string | string[],
  fieldLabel?: string
): ValidationResult {
  // Handle array values (multi-choice fields)
  const isArrayValue = Array.isArray(value);
  const stringValue = isArrayValue ? "" : (value as string);

  // Check required fields
  if (field.required) {
    if (isArrayValue) {
      if (value.length === 0) {
        return { valid: false, error: "This field is required" };
      }
    } else if (!validateRequired(stringValue)) {
      return { valid: false, error: "This field is required" };
    }
  }

  // Allow empty for optional fields
  if (!field.required) {
    if (isArrayValue && value.length === 0) {
      return { valid: true };
    }
    if (!isArrayValue && stringValue.trim().length === 0) {
      return { valid: true };
    }
  }

  // Validate based on field type
  switch (field.type) {
    case "email": {
      if (isArrayValue) {
        return {
          valid: false,
          error: "Email field cannot have multiple values",
        };
      }
      if (!validateEmail(stringValue)) {
        return {
          valid: false,
          error:
            "Please provide a valid email address (e.g., name@example.com)",
        };
      }
      return { valid: true };
    }

    case "url": {
      if (isArrayValue) {
        return { valid: false, error: "URL field cannot have multiple values" };
      }
      if (!validateUrl(stringValue)) {
        return {
          valid: false,
          error: "Please provide a valid URL (e.g., https://example.com)",
        };
      }
      return { valid: true };
    }

    case "number": {
      if (isArrayValue) {
        return {
          valid: false,
          error: "Number field cannot have multiple values",
        };
      }
      return validateNumber(
        stringValue,
        field.validation?.min,
        field.validation?.max
      );
    }

    case "date": {
      if (isArrayValue) {
        return {
          valid: false,
          error: "Date field cannot have multiple values",
        };
      }
      return validateDate(stringValue, fieldLabel ?? field.label);
    }

    case "choice": {
      if (!field.options?.choices) {
        return { valid: false, error: "Invalid field configuration" };
      }

      // Check if this is a multi-select field
      if (field.options.multiSelect) {
        if (!isArrayValue) {
          return {
            valid: false,
            error: "Multi-select field requires array of values",
          };
        }
        return validateMultiChoice(value as string[], field.options.choices);
      }

      // Single-select field
      if (isArrayValue) {
        return {
          valid: false,
          error: "Single-select field cannot have multiple values",
        };
      }
      return validateChoice(stringValue, field.options.choices);
    }

    case "scale": {
      if (isArrayValue) {
        return {
          valid: false,
          error: "Scale field cannot have multiple values",
        };
      }
      if (!field.options?.min || !field.options?.max) {
        return { valid: false, error: "Invalid field configuration" };
      }
      return validateScale(stringValue, field.options.min, field.options.max);
    }

    case "text":
    case "longtext": {
      if (isArrayValue) {
        return {
          valid: false,
          error: "Text field cannot have multiple values",
        };
      }
      // Text fields are always valid if non-empty (checked above)
      return { valid: true };
    }

    case "file": {
      // File validation requires file metadata
      // This should be called with validateFile() instead
      return {
        valid: false,
        error: "Please upload a file",
      };
    }

    default: {
      return { valid: false, error: "Unknown field type" };
    }
  }
}

export function validateFile(
  field: FormField,
  fileUrl: string,
  fileName: string,
  mimeType: string
): ValidationResult {
  // Check if required field
  if (field.required && (!fileUrl || !fileName)) {
    return { valid: false, error: "Please upload a file" };
  }

  // If optional and no file provided, that's okay
  if (!field.required && (!fileUrl || !fileName)) {
    return { valid: true };
  }

  // Validate file type against accepted types
  const acceptedTypes = field.validation?.acceptedTypes || [];

  if (acceptedTypes.length > 0) {
    // Map extensions to MIME types
    const mimeTypeMap: Record<string, string[]> = {
      ".pdf": ["application/pdf"],
      ".doc": ["application/msword"],
      ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      ".xls": ["application/vnd.ms-excel"],
      ".xlsx": [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      ".csv": ["text/csv"],
      ".txt": ["text/plain"],
      ".jpg": ["image/jpeg"],
      ".jpeg": ["image/jpeg"],
      ".png": ["image/png"],
      ".gif": ["image/gif"],
      ".svg": ["image/svg+xml"],
    };

    const allowedMimeTypes: string[] = [];
    for (const ext of acceptedTypes) {
      const mimes = mimeTypeMap[ext.toLowerCase()];
      if (mimes) {
        allowedMimeTypes.push(...mimes);
      }
    }

    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `File type not accepted. Please upload: ${acceptedTypes.join(", ")}`,
      };
    }
  }

  // Return file metadata for storage
  return {
    valid: true,
    parsedValue: fileUrl,
    fileMetadata: {
      url: fileUrl,
      name: fileName,
      mimeType,
    },
  };
}
