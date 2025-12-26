// src/utils/errorResponse.ts

import { ApiErrorResponse, ErrorDetail, GenericWebSocketResponse } from "@uxp/common";
import { FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { AppLogger, RequestMetaData } from "../utils/AppLogger";

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
     action: string, error: ErrorDetail, messageId: string | undefined, details?: object): string => {
    AppLogger.error(request, {
        message: error.message,

        object: { action, errorCode: error.code, messageId },
    });
    return JSON.stringify({
        success: false,
        action,
        id: messageId,
        error,
        errorDetails: details,
    } as GenericWebSocketResponse);
};
