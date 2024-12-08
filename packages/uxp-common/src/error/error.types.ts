import { ErrorCode } from "./ErrorCodes";

// src/types/ErrorResponse.ts
export interface ErrorDetail {
    code: ErrorCode;
    message?: string; // Optional for debugging/logging
    params?: Record<string, string | number>; // Optional parameters for the UI
}

export interface ApiErrorResponse {
    errors: ErrorDetail[];
    details?: {
        timestamp: string;
        path: string;
        correlationId: string;
    };
}
