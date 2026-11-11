import { SerializedError } from "@reduxjs/toolkit";
import { ApiErrorResponse, ErrorCode } from "@uxp/common";
import { ErrorMessages } from "./errorMessages";

export type ErrorParams = Record<string, string | number>;
/** A fixed text, or a text made from the params the server sent with the error (undefined when it sent none). */
export type ErrorMessage = string | ((params: ErrorParams | undefined) => string);
export type ErrorCodeMessageMap = Partial<Record<ErrorCode, ErrorMessage>>;


export function mapApiErrorCodeToMessage(
  code: ErrorCode,
  overrides?: ErrorCodeMessageMap,
  params?: ErrorParams
): string {
  const override = overrides?.[code];
  if (override) return typeof override === 'function' ? override(params) : override;
  const message = ErrorMessages[code];
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
      .map((error) => mapApiErrorCodeToMessage(error.code, overrides, error.params))
      .join(separator);
  }

  // Single error case
  if (isErrorCodeResponse(response)) {
    return mapApiErrorCodeToMessage(response.error.code, overrides, response.error.params);
  }
  if(typeof response === 'string'){
    return response;
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
export function isErrorCodeResponse(data: unknown): data is { error: { code: ErrorCode; params?: ErrorParams } } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as any).error?.code === 'string')

}

export function extractErrorCodeResponse(data: unknown): ApiErrorResponse | undefined {
  if (isErrorCodeResponse(data) || isErrorsCodeResponse(data)) {
    return data as ApiErrorResponse
  }
  return undefined;
}

export function isSerializedError(error: unknown): error is SerializedError {
  return (
    !!error &&
    typeof error === 'object' &&
    // A SerializedError will have at least one of these string keys if it exists
    (
      'message' in error ||
      'name' in error ||
      'stack' in error ||
      'code' in error
    )
  );
}
export function extractSerializedError(error: unknown): SerializedError | undefined {
  if (isSerializedError(error)) {
    return error as SerializedError
  }
  return undefined;
}