import { ErrorCode } from "./ErrorCodes";

// src/types/ErrorResponse.ts
export interface ErrorDetail {
    code: ErrorCode;
    message?: string; // Optional for debugging/logging
    params?: Record<string, string | number>; // Optional parameters for the UI
}

/** The body of a failed REST request. A WebSocket error response carries the same `error`. */
export interface ApiErrorResponse {
    error: ErrorDetail;
    details?: {
        timestamp: string;
        path: string;
        correlationId: string;
    };
}
