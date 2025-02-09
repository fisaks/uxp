// src/utils/errorResponse.ts

import { ApiErrorResponse, ErrorDetail } from "@uxp/common";
import { FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { AppLogger } from "../utils/AppLogger";

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

export const createErrorMessageResponse = (request: FastifyRequest, action: string, error: ErrorDetail, details?: object): string => {
    AppLogger.error(request, {
        message: error.message,

        object: { action, errorCode: error.code },
    });
    return JSON.stringify({
        success: false,
        error,
        details,
    });
};
