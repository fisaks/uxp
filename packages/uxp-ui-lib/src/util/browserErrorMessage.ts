import { ApiErrorResponse, ErrorCode } from "@uxp/common";

export type ErrorCodeMessageMap = Partial<Record<ErrorCode, string>>;

const errorCodeMessages: ErrorCodeMessageMap = {
  INTERNAL_SERVER_ERROR: 'Something went wrong on our end.',
  UNAUTHORIZED: 'You’re not logged in.',
  FORBIDDEN: 'You don’t have access.',
  VALIDATION: 'There’s a validation error.',
  NOT_FOUND: 'Resource not found.',
  PATCH_VERSION_CONFLICT: 'This version is outdated.',
  RESOURCE_NOT_FOUND: 'Resource not found.',
  DISCONNECTED: 'Connection lost.',
  TIMEOUT: 'Request timed out.',
};

export function mapApiErrorCodeToMessage(
  code: ErrorCode,
  overrides?: ErrorCodeMessageMap
): string {
  if (overrides?.[code]) return overrides[code];
  const message = errorCodeMessages[code];
  return message ?? 'An unknown error occurred.';
}


export function mapApiErrorsToMessageString(
  response: unknown,
  overrides?: ErrorCodeMessageMap,
  separator = '\n'
): string {

  // Multi-error case
  if (isErrorsCodeResponse(response)) {
    if (!response.errors || response.errors.length === 0) {
      return 'An unknown error occurred.';
    }

    return response.errors
      .map((error) => mapApiErrorCodeToMessage(error.code, overrides))
      .join(separator);
  }

  // Single error case
  if (isErrorCodeResponse(response)) {
    return mapApiErrorCodeToMessage(response.error.code, overrides);
  }

  // Fallback
  return 'An unknown error occurred.';

}

// Checks if it's a response with multiple error codes
export function isErrorsCodeResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "errors" in data &&
    Array.isArray((data as ApiErrorResponse).errors) &&
    (data as ApiErrorResponse).errors.every((error) => typeof error.code === "string")
  );
}
// Checks if it's a response with a single error code object
export function isErrorCodeResponse(data: unknown): data is { error: { code: ErrorCode } } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as any).error?.code === 'string')

}
