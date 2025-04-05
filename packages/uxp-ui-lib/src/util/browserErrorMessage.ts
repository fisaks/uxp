import { AxiosUtil, ErrorCode } from "@uxp/common";

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

  if (!AxiosUtil.isErrorResponse(response)) {
    return 'An unknown error occurred.';
  }

  if (!response.errors || response.errors.length === 0) {
    return 'An unknown error occurred.';
  }

  return response.errors
    .map(error => mapApiErrorCodeToMessage(error.code as ErrorCode, overrides))
    .join(separator);
}
