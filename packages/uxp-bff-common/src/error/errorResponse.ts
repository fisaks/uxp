// src/utils/errorResponse.ts

import { ApiErrorResponse, ErrorCodes, ErrorDetail, GenericWebSocketResponse } from "@uxp/common";
import { FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { AppLogger, RequestMetaData } from "../utils/AppLogger";
import { AppErrorV2 } from "./AppError";

const isDevelopment = () => process.env.NODE_ENV === "development";

/**
 * The one place an error becomes an ErrorDetail for the client: code and params always,
 * message only in development (it is for logging), nothing else (no status code, no cause, no stack).
 */
export const toErrorDetail = (error: unknown): ErrorDetail => {
    if (error instanceof AppErrorV2) {
        return { code: error.code, message: isDevelopment() ? error.message : undefined, params: error.params };
    }
    return {
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: isDevelopment() && error instanceof Error ? error.message : undefined,
    };
};

export const createErrorResponse = (errors: ErrorDetail[], request: FastifyRequest): ApiErrorResponse => {
    return {
        errors,
        details: {
            timestamp: DateTime.utc().toISO(),
            path: request.url,
            correlationId: request.id, // Fastify automatically assigns a unique ID to each request
        },
    };
};

export const createErrorMessageResponse = (request: FastifyRequest | RequestMetaData,
     action: string, error: ErrorDetail, messageId: string | undefined, details?: object, cause?: unknown): string => {
    // Logged once, here. A request the client got wrong (an unknown id, a command that does not fit the state) is a warning, not a fault of the server.
    const log = cause instanceof AppErrorV2 && cause.statusCode < 500 ? AppLogger.warn.bind(AppLogger) : AppLogger.error.bind(AppLogger);
    log(request, { message: error.message ?? "Error in WebSocket message", error: cause as Error | undefined, object: { action, errorCode: error.code, messageId } });
    return JSON.stringify({
        success: false,
        action,
        id: messageId,
        error: { code: error.code, message: isDevelopment() ? error.message : undefined, params: error.params },
        errorDetails: details,
    } as GenericWebSocketResponse);
};
