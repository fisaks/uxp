// src/plugins/errorHandler.ts
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppLogger } from "../utils/AppLogger";
import { AppError } from "./AppError";
import { createErrorResponse } from "./errorResponse";

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Log the error for debugging
    AppLogger.error(request, { error: error });

    const statusCode = (error instanceof AppError ? error.statusCode : error.statusCode) || 500;
    const code = error instanceof AppError ? error.code : "INTERNAL_SERVER_ERROR";
    const params = error instanceof AppError ? error.params : undefined;

    // Create a structured error response
    const response = createErrorResponse(
        [
            {
                code,
                message: process.env.NODE_ENV === "development" ? error.message : undefined,
                params,
            },
        ],
        request
    );

    reply.status(statusCode).send(response);
};
