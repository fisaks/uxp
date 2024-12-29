// src/utils/errorResponse.ts
import { ApiErrorResponse, ErrorDetail } from "@uxp/common";
import { FastifyRequest } from "fastify";
import { DateTime } from "luxon";

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

export const createErrorMessageResponse = (error: ErrorDetail, details?: object): string => {
    return JSON.stringify({
        success: false,
        error,
        details,
    });
};
