// src/plugins/errorHandler.ts
import { ErrorCodes } from "@uxp/common";
import { ErrorObject } from "ajv";
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppLogger } from "../utils/AppLogger";
import { AppError, AppErrorV2 } from "./AppError";
import { createErrorResponse } from "./errorResponse";

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Log the error for debugging
    AppLogger.error(request, { error: error, message: "GLOBAL ERROR HANDLER" + process.env.NODE_ENV });

    if (error instanceof AppError || error instanceof AppErrorV2) {
        handleAppError(error, request, reply);

    } else if (error.code === "FST_ERR_VALIDATION") {
        handleAJvError(error, request, reply);
    } else {
        handleGeneralError(error, request, reply);
    }
};

const handleAJvError = (error: FastifyError & { validation?: ErrorObject[] }, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    const code = ErrorCodes.VALIDATION;
    const validation = error.validation ?? [];
    AppLogger.error(request, { object: { RequestBody: request.body } });

    const message = process.env.NODE_ENV === "development" ? validation.map((error) => error.message).join(", ") : undefined;
    const params = validation
        .map((error) => ({
            field: error.instancePath.replace(/^\/|\/+/g, (_match, offset) => (offset === 0 ? "" : ".")),
            keyword: error.keyword,
        }))
        .reduce(
            (acc, curr) => ({
                ...acc,
                [curr.field]: curr.keyword,
            }),
            {}
        );

    reply.status(statusCode).send(
        createErrorResponse(
            [
                {
                    code,
                    message,
                    params,
                },
            ],
            request
        )
    );
};

const handleAppError = (error: AppError | AppErrorV2, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    const code = error.code ?? "INTERNAL_SERVER_ERROR";
    const params = error.params;

    reply.status(statusCode).send(
        createErrorResponse(
            [
                {
                    code,
                    message: process.env.NODE_ENV === "development" ? error.message : undefined,
                    params,
                },
            ],
            request
        )
    );
};
const handleGeneralError = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode || 500;
    const code = "INTERNAL_SERVER_ERROR";
    const params = undefined;

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
