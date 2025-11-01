/**
 * Validation utilities for form field responses
 * Used by collect-field-response and submit-form-response tools
 */

export type ValidationResult = {
  valid: boolean;
  error?: string;
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
 * Validate date format
 */
export function validateDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
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
  value: string
): ValidationResult {
  // Check required fields
  if (field.required && !validateRequired(value)) {
    return { valid: false, error: "This field is required" };
  }

  // Allow empty for optional fields
  if (!field.required && value.trim().length === 0) {
    return { valid: true };
  }

  // Validate based on field type
  switch (field.type) {
    case "email": {
      if (!validateEmail(value)) {
        return {
          valid: false,
          error:
            "Please provide a valid email address (e.g., name@example.com)",
        };
      }
      return { valid: true };
    }

    case "url": {
      if (!validateUrl(value)) {
        return {
          valid: false,
          error: "Please provide a valid URL (e.g., https://example.com)",
        };
      }
      return { valid: true };
    }

    case "number": {
      return validateNumber(
        value,
        field.validation?.min,
        field.validation?.max
      );
    }

    case "date": {
      if (!validateDate(value)) {
        return {
          valid: false,
          error: "Please provide a valid date",
        };
      }
      return { valid: true };
    }

    case "choice": {
      if (!field.options?.choices) {
        return { valid: false, error: "Invalid field configuration" };
      }
      return validateChoice(value, field.options.choices);
    }

    case "scale": {
      if (!field.options?.min || !field.options?.max) {
        return { valid: false, error: "Invalid field configuration" };
      }
      return validateScale(value, field.options.min, field.options.max);
    }

    case "text":
    case "longtext": {
      // Text fields are always valid if non-empty (checked above)
      return { valid: true };
    }

    case "file": {
      // File uploads handled separately in Phase 3.4
      return {
        valid: false,
        error: "File uploads are not yet supported",
      };
    }

    default: {
      return { valid: false, error: "Unknown field type" };
    }
  }
}
